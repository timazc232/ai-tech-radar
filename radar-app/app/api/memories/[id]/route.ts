import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { forgetMemory, getMemory, updateMemory } from '@/modules/memory/service';

export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  content: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mem = getMemory(id);
  if (!mem) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'memory', requestId: id } }, { status: 404 });
  }
  return NextResponse.json({ data: mem });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: id } },
      { status: 400 },
    );
  }
  try {
    const mem = updateMemory(id, parsed.data);
    return NextResponse.json({ data: mem });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'memory', requestId: id } }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = forgetMemory(id);
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'memory', requestId: id } }, { status: 404 });
  }
}
