import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class ScanUrlDto {
  @IsString({ message: 'URL must be a string' })
  @IsNotEmpty({ message: 'URL is required' })
  @IsUrl({}, { message: 'Must be a valid URL (e.g. https://example.com)' })
  url: string;
}
