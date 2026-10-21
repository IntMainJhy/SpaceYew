# Shared publishing and moderation / 共享发布与审核

This build is a local evaluation, not approval for public operation in mainland China. Accounts, publishing and Connect retain the existing local-only gate. Email verification and invitations do not establish legally required real-identity verification.

本版本仍用于本地验证，并不表示已满足中国大陆网站正式运营条件。邮箱验证、邀请注册和本地测试资格不替代依法需要的真实身份信息认证。

## What is implemented / 已实现

- Members own separate drafts and revisions for documents, Skills and other resources. Approved versions appear in their catalog and one linked community share; updates reuse that share. Withdrawal, takedown, complaints and account restrictions are checked before public access.
- Rule-based screening runs before publishing. In automatic mode, low-risk plain text can pass. Known risk signals, images, external links and installation commands go to human review; manual mode holds all submissions. Reviewers record a reason. Rule hits are risk signals, not legal determinations, and do not automatically ban accounts.
- Static HTML/ZIP blogs stay in the existing isolated sandbox and manual review flow. The platform does not execute server builds or private client binaries.
- Scoped, revocable AI credentials use the same validation and review service. Submission requires publish scope, explicit user intent, current policy acceptance and an idempotency key. AI cannot approve reviews.

## Before opening publicly / 正式开放前

Automatic screening reduces repetitive review but cannot guarantee compliance. Current rules are not a semantic AI moderation provider or an exhaustive illegal-content detector. Before removing the local gate, the operator must complete and verify real-identity and account management, appropriate content/media/link review coverage, staff and escalation ownership, recurring inspection, incident handling, complaints and appeals, evidence/log retention, privacy notices and necessary information-security measures. Configure actual contact details and effective policy versions. Determine whether the concrete service requires additional filings, permits or security assessment with the relevant authorities; ICP filing alone is not a certification of this content-hosting business.

自动筛查只能辅助审核。运营者仍需落实实名核验、审核与巡查人员、举报申诉和应急处置、依法保存记录及报告、隐私保护等责任。静态托管让用户公开发布内容，应结合最终服务范围核对适用备案、许可及安全评估要求；不能仅凭已取得 ICP 备案就认定可以直接开放全部 SaaS 功能。

## Primary sources checked on 2026-10-21 / 核对依据

- [CAC: Provisions on Internet Comment Services (2022)](https://www.cac.gov.cn/2022-11/16/c_1670253725725039.htm): requires real-identity verification, review/patrol/emergency mechanisms, user agreements, reports and complaints; news comments specifically require review before publication.
- [CAC: Provisions on Governance of the Online Information Content Ecosystem](https://www.cac.gov.cn/2019-12/20/c_1578375159509309.htm): platform responsibility, content governance, unlawful/harmful content handling, records and reporting, accessible complaints, and governance reporting.

These are the verified core sources for this implementation, not an exhaustive legal analysis. Operational review must follow the final deployment model, scale and current applicable rules.
