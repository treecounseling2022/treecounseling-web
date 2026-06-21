import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#3a4a3a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f5f1ea",
          fontSize: 48,
        }}
      >
        Tree Counseling Studio
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
