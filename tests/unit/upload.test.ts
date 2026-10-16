import { expect, test } from "vitest";
import { iphoneVideoTip } from "@/lib/upload";

const file = (name: string, type: string) => new File(["x"], name, { type });

test("iPhone .mov videos get the compatibility tip", () => {
  expect(iphoneVideoTip([file("IMG_1234.MOV", "video/quicktime")])).toMatch(/Most Compatible/);
  expect(iphoneVideoTip([file("clip.mov", "")])).toMatch(/Most Compatible/);
});

test("photos and mp4 videos don't", () => {
  expect(iphoneVideoTip([file("ring.jpg", "image/jpeg"), file("clip.mp4", "video/mp4")])).toBeNull();
});
