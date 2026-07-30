import { NextResponse } from 'next/server';

export const maxDuration = 300; // Vercel Pro/fluid allows up to 300s

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const modalUrl = process.env.MODAL_API_URL;
    if (!modalUrl) {
      return new NextResponse('Modal API URL is not configured', { status: 500 });
    }

    const modalRes = await fetch(modalUrl, {
      method: 'POST',
      body: formData,
    });

    if (!modalRes.ok) {
      const errorText = await modalRes.text();
      return new NextResponse(`Modal Error: ${errorText}`, { status: modalRes.status });
    }

    const blob = await modalRes.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: { 'Content-Type': modalRes.headers.get('Content-Type') || 'image/jpeg' },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
