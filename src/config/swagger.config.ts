import { DocumentBuilder } from '@nestjs/swagger';

import { EnvironmentProviderInterface } from './interfaces/environment.interface';

interface SwaggerConfigParams extends Partial<EnvironmentProviderInterface> {}

export const swaggerConfig = (_environment: SwaggerConfigParams) =>
  new DocumentBuilder()
    .setTitle('Zolve — BFF')
    .setDescription(
      `Backend for Frontend da plataforma Zolve. Agrega dados do Backend API em contratos otimizados para o frontend.\n\n` +
      `**Autenticação:** Headers \`X-User-Id\`, \`X-User-Roles\` e \`X-User-Type\` injetados pelo Kong.\n\n` +
      `**Server-Driven UI:** Módulos \`home\` e \`search\` retornam layout dinâmico configurado via MongoDB.`,
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-User-Id', in: 'header', description: 'keycloak_id do usuário (injetado pelo Kong)' }, 'kong-user-id')
    .addServer('http://localhost:3001', 'Development')
    .addTag('Home', 'Tela inicial — categorias e prestadores em destaque (SDUI)')
    .addTag('Search', 'Busca de prestadores com filtros (SDUI)')
    .addTag('Provider Profile', 'Perfil completo agregado do prestador')
    .addTag('Dashboard', 'Dashboards do contratante e do prestador')
    .addTag('Chat', 'Chat em tempo real — salas e mensagens')
    .addTag('Notifications', 'Proxy de notificações in-app')
    .addTag('Screens', 'Admin — gerenciamento de configurações de telas (SDUI)')
    .build();
