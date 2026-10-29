const maxImageBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/avif", "image/webp", "image/jpeg", "image/png"]);

function hasExpectedSignature(content: Buffer, contentType: string) {
  if (contentType === "image/png")
    return content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === "image/jpeg")
    return content.length > 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  if (contentType === "image/webp")
    return (
      content.toString("ascii", 0, 4) === "RIFF" && content.toString("ascii", 8, 12) === "WEBP"
    );
  if (contentType === "image/avif")
    return (
      content.toString("ascii", 4, 8) === "ftyp" && /avi[fs]/.test(content.toString("ascii", 8, 16))
    );
  return false;
}

function imageDimensions(
  content: Buffer,
  contentType: string,
): { width: number; height: number } | null {
  if (contentType === "image/png" && content.length >= 24) {
    return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
  }
  if (contentType === "image/jpeg") {
    let offset = 2;
    while (offset + 4 < content.length) {
      if (content[offset] !== 0xff) return null;
      const marker = content[offset + 1];
      const length = content.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > content.length) return null;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        if (length < 7) return null;
        return {
          height: content.readUInt16BE(offset + 5),
          width: content.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
    return null;
  }
  if (contentType === "image/webp" && content.length >= 30) {
    const chunk = content.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return {
        width: 1 + content.readUIntLE(24, 3),
        height: 1 + content.readUIntLE(27, 3),
      };
    }
    if (chunk === "VP8L" && content[20] === 0x2f) {
      const b1 = content[21],
        b2 = content[22],
        b3 = content[23],
        b4 = content[24];
      return {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      };
    }
    if (chunk === "VP8 " && content[23] === 0x9d && content[24] === 0x01 && content[25] === 0x2a) {
      return {
        width: content.readUInt16LE(26) & 0x3fff,
        height: content.readUInt16LE(28) & 0x3fff,
      };
    }
    return null;
  }
  if (contentType === "image/avif") {
    const marker = content.indexOf("ispe", 0, "ascii");
    if (marker >= 0 && marker + 16 <= content.length) {
      return { width: content.readUInt32BE(marker + 8), height: content.readUInt32BE(marker + 12) };
    }
  }
  return null;
}

export function validateCatalogProductImage(input: {
  content: Buffer;
  contentType: string;
  altText: string;
  width: number;
  height: number;
}): string | null {
  if (
    !allowedTypes.has(input.contentType) ||
    !input.content.length ||
    input.content.length > maxImageBytes
  )
    return "catalog_image_not_allowed";
  if (!hasExpectedSignature(input.content, input.contentType))
    return "catalog_image_signature_invalid";
  const actualDimensions = imageDimensions(input.content, input.contentType);
  if (
    !actualDimensions ||
    actualDimensions.width !== input.width ||
    actualDimensions.height !== input.height
  )
    return "catalog_image_dimensions_invalid";
  if (!input.altText.trim() || input.altText.trim().length > 500)
    return "catalog_image_alt_invalid";
  if (
    !Number.isSafeInteger(input.width) ||
    !Number.isSafeInteger(input.height) ||
    input.width < 1 ||
    input.height < 1 ||
    input.width > 10_000 ||
    input.height > 10_000 ||
    input.width * input.height > 40_000_000
  )
    return "catalog_image_dimensions_invalid";
  return null;
}
