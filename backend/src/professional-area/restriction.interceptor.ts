import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

// Quem entra como PROFISSIONAL so pode usar a Minha area.
@Injectable()
export class ProfessionalRestrictionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (req && req.user && req.user.role === 'PROFESSIONAL') {
      const raw = String(req.originalUrl || req.url || '');
      const path = raw.split('?')[0].replace(/^\/api/, '');
      if (!path.startsWith('/professional-area')) {
        throw new ForbiddenException('Seu acesso não permite abrir esta área.');
      }
    }
    return next.handle();
  }
}
