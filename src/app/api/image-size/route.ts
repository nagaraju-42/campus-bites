import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

  try {
    const res = await fetch(url, { method: 'HEAD' });
    const bytes = res.headers.get('content-length');
    
    if (bytes) {
      return NextResponse.json({ bytes: parseInt(bytes) });
    }
    return NextResponse.json({ error: 'No content-length header found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch image size' }, { status: 500 });
  }
}


