import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return new NextResponse("No VAPID Public Key", { status: 500 });
  return new NextResponse(publicKey);
}


