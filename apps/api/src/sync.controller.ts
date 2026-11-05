import { Body, Controller, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthedRequest } from './session';
import { StreamService } from './stream.service';
import { SyncService } from './sync.service';
import { fail } from './util';

const Push = z.object({
  upserts: z.array(z.object({ col: z.string(), id: z.string().max(100), data: z.any() })).max(5000),
  deletes: z.array(z.object({ col: z.string(), id: z.string().max(100) })).max(5000),
  people: z.record(z.string(), z.any()).optional(),
  platform: z.record(z.string(), z.any()).optional(),
  pw: z.record(z.string(), z.string()).optional(),
});

@Controller('api')
export class SyncController {
  constructor(private sync: SyncService, private stream: StreamService) {}

  @Get('changes')
  changes(@Req() req: AuthedRequest, @Query('since') since: string, @Query('scope') scope: string) {
    return this.sync.changes(req.scope, Number(since) || 0, scope || '');
  }

  @Post('sync')
  @HttpCode(200)
  async push(@Req() req: AuthedRequest, @Body() body: unknown) {
    const b = Push.safeParse(body);
    if (!b.success) fail('The update could not be read.');
    return this.sync.push(req.scope, b.data as any);
  }

  /** Stays open and tells this device whenever its data changes. */
  @Get('stream')
  stream_(@Req() req: AuthedRequest, @Res() res: Response) {
    if (req.scope.kind === 'anon') return res.status(401).end();
    res.set({ 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.flushHeaders();
    res.write(': connected\n\n');
    this.stream.add(res, req.scope.kind === 'platform' ? null : req.scope.accountIds);
  }
}
