import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/common/database/drizzle.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { CloudinaryModule } from "src/common/cloudinary/cloudinary.module";



@Module({
  imports: [DrizzleModule,CloudinaryModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}