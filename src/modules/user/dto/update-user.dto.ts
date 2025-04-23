import { PartialType } from '@nestjs/mapped-types';
import { UserProfileDto } from './update-profile.dto';


export class UpdateUserDto extends PartialType(UserProfileDto) {}
