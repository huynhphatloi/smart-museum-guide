import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

const LANGUAGE_PATTERN = /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export class GuideQueryDto {
  /** Requested language, e.g. `?lang=en`. Falls back when unavailable. */
  @IsOptional()
  @IsString()
  @Matches(LANGUAGE_PATTERN, { message: 'lang must look like "vi", "en" or "zh-Hans".' })
  lang?: string;

  /**
   * Optional "as of" timestamp. Lets the admin preview a future date and lets
   * the demo prove that the schedule - not the hardware - decides the content.
   */
  @IsOptional()
  @IsDateString({}, { message: 'at must be an ISO date-time string.' })
  at?: string;
}
