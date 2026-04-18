import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.session.get('authenticated') !== true) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
      statusCode: 401,
    });
  }
}
