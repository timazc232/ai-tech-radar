import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createMemory, isLearningPaused, listMemories, setLearningPaused,
} from '@/modules/memory/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') as 'interest' | 'entity' | 'research' | 'feedback' | null;
  return NextResponse.json({
    data: {
      memories: listMemories(type ?? undefined),
      learningPaused: isLearningPaused(),
    },
  });
}

const Body = z.object({
  type: z.enum(['interest', 'entity', 'research', 'feedback']),
  content: z.record(z.unknown()),
  evidence: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: 'memories' } },
      { status: 400 },
    );
  }
  const mem = createMemory(parsed.data);
  return NextResponse.json({ data: mem }, { status: 201 });
}

const LearningBody = z.object({ learningPaused: z.boolean() });

export async function PUT(req: NextRequest) {
  const parsed = LearningBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: 'memories' } },
      { status: 400 },
    );
  }
  setLearningPaused(parsed.data.learningPaused);
  return NextResponse.json({ data: { learningPaused: isLearningPaused() } });
}
