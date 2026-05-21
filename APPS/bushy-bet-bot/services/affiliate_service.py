from __future__ import annotations

from db.repositories import Repositories


class AffiliateService:
    def __init__(self, repositories: Repositories) -> None:
        self.repositories = repositories

    def add_link(self, platform_name: str, affiliate_url: str, region: str, campaign_tag: str | None) -> int:
        return self.repositories.add_affiliate_link(platform_name, affiliate_url, region, campaign_tag)
