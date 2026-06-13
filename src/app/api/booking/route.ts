import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Mock Booking Request Received:", body);

    // 可以在此做簡單的驗證
    if (!body.name || !body.email || !body.phone || !body.serviceType || !body.preferredTimes) {
      return NextResponse.json(
        { error: "缺少必要欄位" },
        { status: 400 }
      );
    }

    // 回傳成功
    return NextResponse.json({
      success: true,
      message: "預約已成功收到 (Mock)",
      data: body,
    });
  } catch (error) {
    console.error("Booking API Error:", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤" },
      { status: 500 }
    );
  }
}
