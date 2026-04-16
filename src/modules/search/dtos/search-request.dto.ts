import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiHideProperty } from '@nestjs/swagger';

export class SearchRequestDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  @ApiHideProperty()
  category_id?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  ratingMin?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  @ApiHideProperty()
  rating_min?: number;

  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
