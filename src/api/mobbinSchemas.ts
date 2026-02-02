import { z } from 'zod';

export const ScreenCdnImgSourcesSchema = z
  .object({
    src: z.string().url().optional().nullable(),
    srcSet: z.string().optional().nullable(),
    downloadableSrc: z.string().url().optional().nullable(),
  })
  .passthrough();

export const FetchScreensItemSchema = z
  .object({
    id: z.string(),
    appName: z.string().optional().nullable(),
    platform: z.string().optional().nullable(),
    screenUrl: z.string().optional().nullable(),
    fullpageScreenUrl: z.string().optional().nullable(),
    screenPatterns: z.array(z.string()).optional().nullable(),
    screenElements: z.array(z.string()).optional().nullable(),
    screenCdnImgSources: ScreenCdnImgSourcesSchema.optional().nullable(),
    fullpageScreenCdnImgSources: ScreenCdnImgSourcesSchema.optional().nullable(),
  })
  .passthrough();

export const FetchScreensResponseSchema = z.object({
  value: z.object({
    data: z.array(FetchScreensItemSchema),
  }),
});

export const FetchScreenInfoResponseSchema = z.object({
  value: z
    .object({
      id: z.string(),
      screenNumber: z.number().optional().nullable(),
      screenUrl: z.string().optional().nullable(),
      appFullpageScreen: z
        .object({
          fullpageScreenUrl: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
      appVersion: z
        .object({
          app: z
            .object({
              id: z.string().optional().nullable(),
              appName: z.string().optional().nullable(),
              platform: z.string().optional().nullable(),
              appLogoUrl: z.string().optional().nullable(),
            })
            .optional()
            .nullable(),
        })
        .optional()
        .nullable(),
      // sometimes present
      screenCdnImgSources: ScreenCdnImgSourcesSchema.optional().nullable(),
      fullpageScreenCdnImgSources: ScreenCdnImgSourcesSchema.optional().nullable(),
    })
    .passthrough(),
});
