import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function hasBookmarkToken(request: FastifyRequest): boolean {
  const expected = process.env['BOOKMARK_API_TOKEN'];
  const supplied = /^Bearer +([^\s,]+)$/i.exec(request.headers.authorization ?? '')?.[1];
  if (!expected || !supplied) return false;

  return timingSafeEqual(
    createHash('sha256').update(expected).digest(),
    createHash('sha256').update(supplied).digest(),
  );
}

export async function requireBookmarkAccess(request: FastifyRequest, reply: FastifyReply) {
  if (!hasBookmarkToken(request)) return requireAdmin(request, reply);
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((request.session as any).authenticated !== true) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
      statusCode: 401,
    });
  }
}
