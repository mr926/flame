import type { FastifyRequest, FastifyReply } from 'fastify';

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
