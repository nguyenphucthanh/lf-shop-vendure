# Consignment Feature
Check Vendure Docs to make a plan to build this feature, which built-in module can be used (and extended if possible) to use for this feature, and which must be built from scratch.

Given I have a "Product A" (Product Variant), Price: 100.00 (In this document, when I say "product", it is a product variant defined in Vendure)

## Module: Consignment Store
I assume this should work like a customer, but with a few extended fields
- External ID (string, optional)
- Default Discount Percent (number, optional)

## Module: Consignment Quotation
A quotation must be linked to a consignment store and a product, and it must have:
- Consignment Price (price aware, required). Given a store has Default Discount Percent = 30%, then default value of this field is 70.00, but this field must be still editable.

## Module: Intake
An Intake represents receiving goods from a consignment store into the shop. It must belong to a consignment store.

An Intake must have a list of items with these sub fields:
- Reference (link) to which quotation
- Snapshot of actual product price
- Snapshot of quotation's consignment price
- Quantity (number, required)
- Subtotal (price aware, calculated from snapshot of quotation's consignment price × quantity)

An Intake must have these fields:
- Consignment Store (link, required)
- Intake date (date, required)
- Payment Policy (string, optional, give user some suggestions like "COD", "Pay later")
- Delivery Method (string, optional, give user some suggestions like "Self delivery", "External")
- Delivery Tracking Code (string, optional)
- Delivery Cost (price aware, optional, default 0)
- Total (price aware, required) = sum of all items' subtotal + Delivery Cost

## Module: Payment
A Payment must belong to a consignment store. It can reference any quotation from that store without needing to reference a specific past intake.

A Payment must have a list of items with these sub fields:
- Reference (link) to which quotation
- Snapshot of actual product price
- Snapshot of quotation's consignment price
- Quantity (number, required)
- Subtotal (quotation's consignment price × quantity)

A Payment must have these fields:
- Consignment Store (link, required)
- Payment date (date, required)
- Payment Policy (string, optional, give user some suggestions like "COD", "Pay later")
- Payment Method (string, required, options: "Cash", "Bank transfer")
- Payment Status (string, required, options: "Pending", "Completed"). Note: this field is informational only — Remaining Amount is the authoritative indicator of partial payment.
- Subtotal (price aware, required, total of all items' subtotal)
- Discount (price aware, required, default 0.00)
- Total (price aware, required, value = Subtotal - Discount)
- Paid amount (price aware, required, actual paid amount, default = Total)
- Remaining Amount (price aware, required, value = Total - Paid amount)

## Module: Return
A Return must belong to a consignment store. It can reference any quotation from that store without needing to reference a specific past intake.

A Return must have a list of items with these sub fields:
- Reference (link) to which quotation
- Snapshot of actual product price
- Snapshot of quotation's consignment price
- Quantity (number, required)
- Subtotal (quotation's consignment price × quantity)

A Return must have these fields:
- Consignment Store (link, required)
- Returned Date (date, required)
- Reason (string, optional)
- Total (price aware, required, total of all items' subtotal)

## Logic between modules
Intake, Payment, and Return all have a list of quotation items with the same structure. If it is best to define a shared item schema across all three, do so.

As given Product A:
- If I do an intake of 10 Product A, then I have a maximum of 10 Product A to pay and a maximum of 10 to return (across all payments and returns for that store).
- If I make a payment for qty 2 of Product A, then the remaining payable/returnable quantity of Product A is 8.
- The constraint is: total paid qty + total returned qty ≤ total intake qty, per quotation per store. This must be validated on create and edit.
- Snapshot fields are important, as prices can change over time. Snapshots are used in reports.

User can create, edit, and delete Intake, Payment, or Return.

## Report
There must be a report scoped to a specific consignment store (store selector required). The report is in table format, listing all quotations for that store, and each row must show:
- Product image
- Product SKU
- Product name
- Total qty from intake
- Total value from intake
- Total qty from payment
- Total value from payment
- Total qty from returning
- Total value from returning
- Total qty of debt
- Total value of debt

Debt = Intake - Payment - Return