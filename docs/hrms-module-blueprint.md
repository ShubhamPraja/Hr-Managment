# HRMS Module Blueprint

Last updated: February 28, 2026

## Current scope in this project

Already implemented:

- Dashboard
- Employees
- Attendance
- Leave Management
- Payroll
- Settings

## Added in this update (scaffolded modules)

- Recruitment and ATS
- Onboarding and Offboarding
- Performance and Goals
- Learning and Skills
- HR Helpdesk and Cases
- Documents and e-Sign
- Expenses and Reimbursements
- Workforce Planning
- Compliance and Controls
- Engagement and Recognition

## Priority rollout

### P0 (must-have for broad company adoption)

- Recruitment and ATS
- Onboarding and Offboarding
- Documents and e-Sign
- Compliance and Controls

### P1 (high-impact scale layer)

- Performance and Goals
- Learning and Skills
- HR Helpdesk and Cases
- Workforce Planning

### P2 (optimization and employee experience)

- Expenses and Reimbursements
- Engagement and Recognition

## Role access baseline

- Admin: all modules
- HR: all modules except organization-level security controls that are admin-only
- Employee: attendance, leave, payroll, performance (self), learning, helpdesk, documents (self), expenses, engagement

## Why this stack

The module stack is based on capability patterns from enterprise and SMB HR platforms:

- End-to-end HCM suites consistently include Core HR, payroll, time/absence, talent, and analytics.
- Modern platforms add helpdesk/case management and employee experience modules.
- High-adoption HRMS products emphasize onboarding, performance, and document workflows for day-to-day operations.

This blueprint is an implementation inference built from vendor capabilities, adapted to your current architecture.

## Reference sources reviewed

- HR.com directory and topic pages: https://www.hr.com/
- SAP SuccessFactors HCM suite: https://www.sap.com/products/hcm.html
- Workday Human Capital Management: https://www.workday.com/en-us/products/human-capital-management/overview.html
- Oracle Fusion Cloud HCM: https://www.oracle.com/human-capital-management/
- ADP HCM overview: https://www.adp.com/what-we-offer/products/adp-workforce-now.aspx
- BambooHR platform overview: https://www.bamboohr.com/hr-software
- Zoho People feature overview: https://www.zoho.com/people/hrms-software.html
- Rippling product suite: https://www.rippling.com/

