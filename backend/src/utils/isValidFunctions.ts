import imageSize from "image-size";
import { IBase64Image } from "../types/modalTypes";

export interface IIsValidBase64 extends IBase64Image {
  success: boolean;
  base64ErrorMessage: string;
}

// Check size and validity of base64Images
export const isValidBase64 = (base64String: string): IIsValidBase64 => {
  try {
    const requiredRatio: number = 1; // Aspect ratio of 1 only

    const base64Regex = /^data:image\/([a-zA-Z]*);base64,([A-Za-z0-9+/=]*)$/;
    const match = base64String.match(base64Regex);
    if (!match)
      return {
        success: false,
        base64ErrorMessage: "Invalid base64 format",
        content: "",
        type: "",
      };
    const base64Content = match[2];
    const base64Type = match[1];
    console.log(base64Type);

    if (
      !(base64Type === "jpeg" || base64Type === "png" || base64Type === "jpg")
    )
      // Accept only jpeg,png or jpg
      return {
        success: false,
        base64ErrorMessage: "Image should be of type jpeg or png",
        content: "",
        type: "",
      };

    const decodedBuffer = Buffer.from(base64Content, "base64");
    const decodedSize = decodedBuffer.length;

    const maxSize = 5 * 1024 * 1024; // Limit to only 5MB size
    if (decodedSize > maxSize) {
      return {
        success: false,
        base64ErrorMessage: "Image shouldn't exceeds max image size (5MB)",
        content: "",
        type: "",
      };
    }
    // ensure image is has 1:1 ratio
    const decodedDimension = imageSize(decodedBuffer);
    if (!decodedDimension.width || !decodedDimension.height) {
      return {
        success: false,
        base64ErrorMessage: "Invalid image dimensions",
        content: "",
        type: "",
      };
    }
    const { width, height }: { width: number; height: number } =
      decodedDimension as { width: number; height: number };

    const aspectRatio = width / height;

    const tolerance = 0.01; // 1% error

    if (Math.abs(aspectRatio - requiredRatio) > tolerance) {
      return {
        success: false,
        base64ErrorMessage: "Image should be having 1:1 ratio",
        content: "",
        type: "",
      };
    }
    return {
      success: true,
      base64ErrorMessage: "",
      type: base64Type,
      content: base64Content,
    };
  } catch (error) {
    console.log("Image Validity checing error - ");
    return {
      success: false,
      base64ErrorMessage: "Server error",
      content: "",
      type: "",
    };
  }
};
export const isMoreThanWeekOld = (updatedAt: Date) => {
  const currentDate: Date = new Date();
  const differenceInDays =
    (currentDate.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000);
  return differenceInDays >= 7;
};
