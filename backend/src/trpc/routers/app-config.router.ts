import cfg from '../../utils/cfg.ts'
import { publicProcedure, router } from '../trpc-init.ts'

export const appConfigRouter = router({
  /**
   * Public endpoint returning OIDC config and app branding info.
   * Called by the frontend before authentication to configure the OIDC client.
   */
  get: publicProcedure.query(() => ({
    appName: 'OUTLOOK',
    accent: '#fb7185',
    ecosystem: cfg.ecosystem,
    sts: {
      type: cfg.sts.type,
      client_id: cfg.sts.client_id,
      issuer_uri: cfg.sts.issuer_uri,
      scope: cfg.sts.scope,
    },
  })),
})
