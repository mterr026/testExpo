**BUDGET FLOW**

**User Stories & Use Cases**

Version 1.0 — MVP Scope

Version 1.0 \| May 2025

# Document Overview

This document translates the Budget Flow user requirements into
practical user stories, detailed use cases, and structured interaction
flows. It is intended to bridge the gap between product vision, UI/UX
design specifications, functional requirements, and engineering
implementation. All stories and use cases in this document are scoped to
the MVP release and should be read in conjunction with the User
Requirements Document and Functional Requirements Specification.

User stories in this document follow the standard format: As a \[user
type\], I want to \[action\], so that \[outcome\]. Use cases describe
the primary interaction sequences for the most critical product
workflows.

# Scope and Key Assumptions

The following assumptions govern the behavior described throughout this
document and must be respected in all design and engineering decisions
derived from it:

- Purchases reduce safe-to-spend immediately upon being saved,
  regardless of whether they are marked Charged or Pending

- Variable bills use the most recently confirmed amount as an estimate
  until the user provides an updated figure for the current cycle

- CSV and PDF statement imports may suggest recurring expenses, but user
  confirmation is required before any item becomes active — no item may
  be auto-activated

- Sensitive financial identifiers must be stripped from imported
  statement data immediately after recurring transaction detection — raw
  statement files must not be retained

- The MVP does not include spending categories — all tracking is based
  on amount, date, optional description, and paycheck-cycle timing

- Notifications must remain calm and optional — elevated warnings are
  reserved for projected negative balances and significantly overdue
  bills only

# User Roles

The following user roles are defined for the purposes of this document:

|  |  |
|----|----|
| **Role** | **Description** |
| Primary User | An individual managing personal cash flow between paychecks, typically with recurring bills, variable expenses, and some degree of financial stress. |
| Irregular Income User | A user with overtime, hourly, variable, or inconsistent paycheck amounts who requires flexible income scheduling. |
| Manual Tracker | A user who prefers manual control over financial data rather than relying on automatic bank synchronization or categorization. |
| Future Premium User | A user who may choose to enable optional convenience features such as cloud backup, multi-device sync, or AI-assisted onboarding in a future release. |

# User Stories by Feature Area

## 4.1 Onboarding

- As a new user, I want a simple and welcoming entry experience so that
  I understand the purpose of the application without feeling
  overwhelmed before I begin.

- As a new user, I want to enter my paycheck information during setup so
  that the application can build my first paycheck cycle immediately.

- As a new user, I want to add recurring bills during setup so that
  upcoming financial obligations are reflected in my projections from
  day one.

- As a new user, I want the option to upload a CSV or PDF bank statement
  so that recurring expenses can be suggested rather than entered fully
  by hand.

- As a privacy-conscious user, I want sensitive statement data to be
  stripped after detection is complete so that raw financial documents
  are not unnecessarily retained on my device.

- As a new user, I want to review and confirm each detected recurring
  expense individually so that the application does not make financial
  assumptions without my explicit approval.

- As a new user, I want to be able to skip any setup step and explore
  the application immediately so that onboarding does not feel mandatory
  or blocking.

## 4.2 Dashboard and Safe-to-Spend

- As a user, I want to see my safe-to-spend amount as the first thing on
  the dashboard so that I can assess my financial position within
  seconds of opening the application.

- As a user, I want to tap the safe-to-spend figure to view a simple
  breakdown so that I understand exactly how the number was calculated.

- As a user, I want upcoming bills and my essential reserve to be
  factored into the safe-to-spend calculation automatically so that I
  never accidentally spend money needed before my next paycheck.

- As a user, I want the dashboard to remain visually uncluttered so that
  checking my finances does not increase my anxiety.

## 4.3 Paychecks

- As a user, I want to add paycheck dates and amounts so that my
  financial timeline accurately reflects my real income schedule.

- As an overtime or irregular income user, I want to adjust projected
  paycheck amounts for any future cycle so that my plan remains
  realistic when income varies.

- As a user, I want to confirm receipt of a paycheck manually so that
  the application does not assume income has arrived before I have
  actually been paid.

- As a user, I want to view paycheck cycle snapshot cards so that I can
  see which bills and purchases are assigned to each pay period at a
  glance.

- As a user, I want to swipe horizontally between paycheck cycles so
  that I can review future financial obligations without navigating away
  or parsing a dense table.

## 4.4 Recurring Bills

- As a user, I want to add recurring bills so that my regular
  obligations are automatically included in future paycheck-cycle
  projections.

- As a user, I want to edit a bill's due date, amount, or recurrence
  interval so that my plan reflects changes in real-world billing.

- As a user, I want to mark a bill as paid so that my running balance
  and bill status remain accurate for the current cycle.

- As a user with variable bills, I want to confirm or update the payment
  amount before it is applied to my running balance so that estimates
  never become incorrect assumptions.

- As a user, I want to pause a recurring bill without deleting it so
  that I can reactivate it later without re-entering all of its details.

## 4.5 Purchases

- As a user, I want to add a purchase with minimal required fields so
  that keeping my balance accurate does not feel like an administrative
  burden.

- As a user, I want purchases to reduce my safe-to-spend amount
  immediately after saving so that the application always reflects my
  current financial reality.

- As a user, I want to optionally add a short description to a purchase
  so that I can identify it later without requiring category-level
  tracking.

- As a user, I want to mark a purchase as Pending so that temporary
  holds and unsettled transactions are accounted for without being
  treated as final.

- As a user, I want to review my full purchase history so that I can
  verify entries and correct errors at any time.

## 4.6 CSV and PDF Import

- As a user, I want to upload a bank statement so that the application
  can detect possible recurring expenses and suggest them for review.

- As a privacy-conscious user, I want the application to process my
  statement locally so that my financial data is never transmitted to an
  external server.

- As a user, I want to review each suggested recurring expense
  individually so that I retain full control over what becomes active in
  my budget.

- As a user, I want raw statement files to be deleted automatically
  after processing so that unnecessary sensitive data is not retained on
  my device.

## 4.7 Settings, Backup, and Privacy

- As a user, I want to configure my essential spending reserve so that a
  buffer is always factored into my safe-to-spend calculation.

- As a user, I want to export a local backup of my financial data so
  that I am protected against device loss or data corruption.

- As a user, I want to restore my data from a local backup so that I can
  recover my complete financial history on a new or reset device.

- As a user, I want to use the application fully without creating an
  account so that my data never leaves my device unless I choose to
  enable cloud features.

# Primary Use Cases

## UC-01 — Complete Initial Onboarding

Description: A new user opens Budget Flow for the first time and
completes the initial financial setup.

1.  User opens Budget Flow for the first time.

2.  The welcome screen introduces the application's purpose in simple,
    approachable language.

3.  User enters paycheck information, including amount and expected pay
    date.

4.  User adds recurring bills manually or chooses to upload a CSV or PDF
    statement for assisted detection.

5.  If a statement was uploaded, the user reviews each detected
    recurring expense and confirms, edits, or rejects each suggestion
    individually.

6.  User sets an essential spending reserve amount.

7.  The application displays the dashboard with a functional
    safe-to-spend figure and upcoming bill summary.

Expected result: The user reaches a fully functional dashboard with a
populated first paycheck cycle after a guided, low-friction setup
process.

## UC-02 — Add a Manual Purchase

Description: A user records a new purchase to keep the running balance
accurate.

8.  User taps the floating Add Purchase button on the Dashboard.

9.  A bottom sheet opens with the amount input field focused and ready
    for entry.

10. User enters the purchase amount.

11. User optionally enters a short description.

12. User optionally marks the purchase as Pending if the transaction has
    not yet settled.

13. User saves the purchase.

14. The purchase is added to purchase history.

15. Safe-to-spend and projected balance update immediately.

Expected result: The purchase is saved and reflected in all balance
calculations without requiring the user to select a spending category.

## UC-03 — Add or Edit a Recurring Bill

Description: A user creates or updates a recurring financial obligation.

16. User opens the Bills screen.

17. User taps Add Bill or selects an existing bill to edit.

18. User enters or updates the bill name, amount, due date, and
    recurrence interval.

19. User marks the bill as Fixed or Variable.

20. User saves the bill.

21. The bill appears in the appropriate paycheck cycle grouping, sorted
    by due date.

Expected result: The recurring bill is included in future paycheck-cycle
projections and safe-to-spend calculations.

## UC-04 — Confirm a Variable Bill

Description: A user confirms the real payment amount for a recurring
bill that changes each cycle.

22. The application displays the variable bill with an estimated amount
    and a visual indicator that confirmation is required.

23. User taps the bill.

24. A confirmation bottom sheet opens, displaying the estimated amount
    pre-populated for review.

25. User reviews the estimated amount and updates it if the actual
    amount differs.

26. User confirms the amount.

27. All balance and safe-to-spend projections recalculate using the
    confirmed amount.

Expected result: The variable bill is confirmed for the current cycle
and no longer displayed as uncertain or requiring action.

## UC-05 — Import Statement and Confirm Suggestions

Description: A user uploads a CSV or PDF bank statement to assist with
recurring expense detection.

28. User selects the optional statement import option during onboarding
    or from Settings.

29. User uploads a CSV or PDF file from their device.

30. The application processes the file locally, scanning for recurring
    transaction patterns.

31. The system extracts only the fields necessary for detection —
    merchant name, amount, date, and estimated frequency.

32. Sensitive identifiers and unnecessary raw data are stripped and
    discarded immediately.

33. The user is presented with a list of suggested recurring expenses
    for review.

34. The user confirms, edits, or rejects each suggestion individually.

35. Only user-confirmed items are activated as recurring bills.

Expected result: Only items explicitly approved by the user become
active in the budget. Raw statement data is not retained.

## UC-06 — Review a Future Paycheck Cycle

Description: A user reviews projected cash flow and obligations for an
upcoming pay period.

36. User opens the Paychecks screen.

37. The current paycheck cycle card is displayed.

38. User swipes left to navigate to a future paycheck cycle.

39. The cycle card displays the expected paycheck amount, upcoming
    bills, reserve, safe-to-spend, and projected remaining balance.

40. User may tap into individual bill entries for additional detail.

Expected result: The user gains a clear understanding of their future
financial obligations without navigating a dense spreadsheet or
multi-column table.

# Alternate Flows and Edge Cases

The following scenarios must be handled gracefully by both the UI and
the underlying application logic:

- User skips CSV/PDF upload during onboarding: the application continues
  normally with manual paycheck and bill entry — no functionality is
  degraded

- User rejects all detected recurring expenses: no detected items are
  activated — the application does not retry or re-surface rejected
  suggestions without user action

- User edits a paycheck amount after bills have been assigned to that
  cycle: projected balance and safe-to-spend must recalculate
  immediately across all affected cycles

- User has a projected negative balance: the application displays a
  visually elevated but calm, non-judgmental warning — no guilt-driven
  language or aggressive styling

- User has not yet entered any purchases: the application displays a
  calm, informative empty state — not an error condition or a blank
  screen

- User imports a statement but confirms zero recurring expenses: no
  items are activated — the import is treated as complete with no side
  effects

# Acceptance Criteria Summary

|  |  |
|----|----|
| **Feature Area** | **Acceptance Criteria** |
| Onboarding | A first-time user can reach a functional dashboard after entering paycheck and recurring bill information, with or without a statement upload. |
| Safe-to-Spend | Safe-to-spend is clearly visible, comprehensible, and updates immediately after any purchase, bill change, or paycheck confirmation. |
| Purchases | A user can add a purchase in under 10 seconds without selecting a category, and the balance updates immediately. |
| Bills | Recurring bills can be added, edited, marked as paid, paused, and organized by paycheck cycle. |
| Variable Bills | Variable bills display estimated amounts and present users with a confirmation prompt — confirmed amounts recalculate all projections. |
| CSV/PDF Import | Detected expenses require individual confirmation; no item is activated automatically; raw file data is discarded after processing. |
| Offline Use | All core MVP features remain fully functional without an internet connection. |
| Premium | Premium features are presented as optional convenience upgrades and do not block access to any MVP functionality. |

# Notes for Future Documents

This document feeds directly into the following downstream project
artifacts, each of which should reference and build upon the workflows
and acceptance criteria defined herein:

- Functional Requirements Specification — behavioral rules for each
  workflow described above

- System Architecture Design — technical implementation of use case
  flows and data state management

- Database Design Document — data model to support all user story
  entities and state transitions

- API Specification Document — endpoint definitions derived from use
  case data flows

- Security & Privacy Design — privacy handling rules derived from import
  and data-stripping requirements

- Testing Strategy & QA Plan — test cases derived directly from
  acceptance criteria above

- Sprint Roadmap — story prioritization and sprint assignment based on
  MVP scope
