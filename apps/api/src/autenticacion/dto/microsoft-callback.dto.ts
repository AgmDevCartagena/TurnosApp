import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MicrosoftCallbackDto {
  @ApiProperty({ description: 'ID Token de Microsoft' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({ description: 'Access Token de Microsoft', required: false })
  @IsString()
  accessToken?: string;
}
