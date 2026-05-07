import { PluginCommonModule, VendurePlugin } from "@vendure/core";

import { adminApiExtensions } from "./api/api-extensions";
import {
  ConsignmentIntakeFieldResolver,
  ConsignmentPaymentFieldResolver,
  ConsignmentQuotationFieldResolver,
  ConsignmentResolver,
  ConsignmentSoldFieldResolver,
  ConsignmentReturnFieldResolver,
} from "./api/consignment.resolver";
import { ConsignmentQuotation } from "./entities/consignment-quotation.entity";
import { ConsignmentIntake } from "./entities/consignment-intake.entity";
import { ConsignmentIntakeItem } from "./entities/consignment-intake-item.entity";
import { ConsignmentPayment } from "./entities/consignment-payment.entity";
import { ConsignmentSoldItem } from "./entities/consignment-sold-item.entity";
import { ConsignmentSold } from "./entities/consignment-sold.entity";
import { ConsignmentReturn } from "./entities/consignment-return.entity";
import { ConsignmentReturnItem } from "./entities/consignment-return-item.entity";
import { ConsignmentQuotationService } from "./services/consignment-quotation.service";
import { ConsignmentIntakeService } from "./services/consignment-intake.service";
import { ConsignmentPaymentService } from "./services/consignment-payment.service";
import { ConsignmentSoldService } from "./services/consignment-sold.service";
import { ConsignmentReturnService } from "./services/consignment-return.service";
import { ConsignmentReportService } from "./services/consignment-report.service";

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [
    ConsignmentQuotation,
    ConsignmentIntake,
    ConsignmentIntakeItem,
    ConsignmentPayment,
    ConsignmentSold,
    ConsignmentSoldItem,
    ConsignmentReturn,
    ConsignmentReturnItem,
  ],
  providers: [
    ConsignmentQuotationService,
    ConsignmentIntakeService,
    ConsignmentSoldService,
    ConsignmentPaymentService,
    ConsignmentReturnService,
    ConsignmentReportService,
  ],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [
      ConsignmentResolver,
      ConsignmentQuotationFieldResolver,
      ConsignmentIntakeFieldResolver,
      ConsignmentSoldFieldResolver,
      ConsignmentPaymentFieldResolver,
      ConsignmentReturnFieldResolver,
    ],
  },
  dashboard: "./dashboard/index.tsx",
  compatibility: "^3.0.0",
})
export class ConsignmentPlugin {}
