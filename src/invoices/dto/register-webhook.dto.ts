import { IsUrl, IsOptional, IsArray, IsString } from 'class-validator';

export class RegisterWebhookDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[] = ['paid', 'overdue', 'cancelled'];
}