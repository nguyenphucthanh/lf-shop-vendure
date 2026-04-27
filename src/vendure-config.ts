import {
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
  VendureConfig,
} from "@vendure/core";
import {
  defaultEmailHandlers,
  EmailPlugin,
  FileBasedTemplateLoader,
} from "@vendure/email-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import { DashboardPlugin } from "@vendure/dashboard/plugin";
import { GraphiqlPlugin } from "@vendure/graphiql-plugin";
import "dotenv/config";
import path from "path";
import { ProductVariantCostPlugin } from "./plugins/product-variant-cost/product-variant-cost.plugin";
import { ConditionalStockAllocationStrategy } from "./plugins/product-variant-cost/strategies/conditional-stock-allocation.strategy";

const IS_DEV = process.env.APP_ENV === "dev";
const serverPort = +process.env.PORT || 3003;

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    trustProxy: IS_DEV ? false : 1,
    // The following options are useful in development mode,
    // but are best turned off for production for security
    // reasons.
    ...(IS_DEV
      ? {
          adminApiDebug: true,
          shopApiDebug: true,
        }
      : {}),
  },
  authOptions: {
    tokenMethod: ["bearer", "cookie"],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET,
    },
  },
  dbConnectionOptions: {
    type: "postgres",
    // See the README.md "Migrations" section for an explanation of
    // the `synchronize` and `migrations` options.
    synchronize: false,
    migrations: [path.join(__dirname, "./migrations/*.+(js|ts)")],
    logging: false,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA,
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  orderOptions: {
    stockAllocationStrategy: new ConditionalStockAllocationStrategy(),
  },
  // When adding or altering custom field definitions, the database will
  // need to be updated. See the "Migrations" section in README.md.
  customFields: {
    Order: [
      {
        name: "doNotUpdateStock",
        type: "boolean",
        defaultValue: false,
        label: [{ languageCode: "en" as any, value: "Do not update stock" }],
        description: [
          {
            languageCode: "en" as any,
            value:
              "If checked, stock will not be deducted when this order is completed. Note: This setting is only applicable to orders in the Draft state. Once the order leaves the Draft state, changing this value doesn't affect the stock.",
          },
        ],
        public: false,
      },
    ],
    OrderLine: [
      {
        name: "costSnapshot",
        type: "int",
        nullable: true,
        public: false,
        ui: { dashboard: false },
      },
      {
        name: "costCurrencyCodeSnapshot",
        type: "string",
        nullable: true,
        public: false,
        ui: { dashboard: false },
      },
    ],
  },
  plugins: [
    GraphiqlPlugin.init(),
    AssetServerPlugin.init({
      route: "assets",
      assetUploadDir: path.join(__dirname, "../static/assets"),
      // For local dev, the correct value for assetUrlPrefix should
      // be guessed correctly, but for production it will usually need
      // to be set manually to match your production url.
      assetUrlPrefix: IS_DEV ? undefined : "https://www.my-shop.com/assets/",
    }),
    DefaultSchedulerPlugin.init(),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      devMode: true,
      outputPath: path.join(__dirname, "../static/email/test-emails"),
      route: "mailbox",
      handlers: defaultEmailHandlers,
      templateLoader: new FileBasedTemplateLoader(
        path.join(__dirname, "../static/email/templates"),
      ),
      globalTemplateVars: {
        // The following variables will change depending on your storefront implementation.
        // Here we are assuming a storefront running at http://localhost:8080.
        fromAddress: '"example" <noreply@example.com>',
        verifyEmailAddressUrl: "http://localhost:8080/verify",
        passwordResetUrl: "http://localhost:8080/password-reset",
        changeEmailAddressUrl:
          "http://localhost:8080/verify-email-address-change",
      },
    }),
    ProductVariantCostPlugin,
    DashboardPlugin.init({
      route: "dashboard",
      appDir: IS_DEV
        ? path.join(__dirname, "../dist/dashboard")
        : path.join(__dirname, "dashboard"),
    }),
  ],
};
