// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const CurrentUser = createParamDecorator(
//   (data: keyof any, ctx: ExecutionContext) => {
//     const request = ctx.switchToHttp().getRequest();
//     const user = request.user;
//     return data ? user?.[data] : user;
//   },
// );


// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user[data] : request.user; // Extract 'sub' (user ID)
  },
);
