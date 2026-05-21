from __future__ import annotations

from typing import Any

TAGLINE = "Football picks with receipts."
SECONDARY_LINE = "The pitch talks. Bushy Bet listens."
RESPONSIBLE_GAMBLING_FOOTER = (
    "18+ only.\n"
    "Bet responsibly.\n"
    "No guaranteed wins.\n"
    "Use licensed platforms available in your region."
)


def format_pick_card(pick: dict[str, Any]) -> str:
    affiliate_line = f"\nAffiliate: {pick.get('affiliate_url')}" if pick.get("affiliate_url") else ""
    stats_line = f"\nMatch stats: {pick.get('stats_summary')}" if pick.get("stats_summary") else ""
    return (
        "⚽ Bushy Bet Pick\n"
        f"{TAGLINE}\n\n"
        f"Match: {pick.get('match_name', '-') }\n"
        f"League: {pick.get('league', '-') }\n"
        f"Market: {pick.get('market', '-') }\n"
        f"Selection: {pick.get('selection', '-') }\n"
        f"Odds: {pick.get('odds', '-') }\n"
        f"Confidence: {pick.get('confidence', '-') }\n"
        f"Risk: {pick.get('risk_level', '-') }\n"
        f"Reason: {pick.get('reasoning', '-') }"
        f"{stats_line}"
        f"{affiliate_line}\n\n"
        f"{SECONDARY_LINE}\n\n"
        f"{RESPONSIBLE_GAMBLING_FOOTER}"
    )


def format_today_picks(picks: list[dict[str, Any]]) -> str:
    if not picks:
        return (
            "No active picks for today yet.\n"
            "Check back later for football picks with receipts.\n\n"
            + RESPONSIBLE_GAMBLING_FOOTER
        )

    sections = [f"Bushy Bet Today\n{TAGLINE}"]
    for index, pick in enumerate(picks, start=1):
        sections.append(
            f"\n{index}. {pick['match_name']}"
            f"\nLeague: {pick['league']}"
            f"\nKickoff: {pick['kickoff_time']}"
            f"\nMarket: {pick['market']}"
            f"\nSelection: {pick['selection']}"
            f"\nOdds: {pick['odds']}"
            f"\nConfidence: {pick['confidence']}"
            f"\nRisk: {pick['risk_level']}"
        )

    sections.append(f"\n{SECONDARY_LINE}\n\n{RESPONSIBLE_GAMBLING_FOOTER}")
    return "\n".join(sections)


def format_results(results: list[dict[str, Any]]) -> str:
    if not results:
        return "No settled picks yet. Transparent results will show here."

    wins = sum(1 for item in results if item["result"] == "win")
    losses = sum(1 for item in results if item["result"] == "loss")
    voids = sum(1 for item in results if item["result"] == "void")

    lines = [
        "Recent Results",
        f"Win: {wins} | Loss: {losses} | Void: {voids}",
    ]
    for item in results:
        lines.append(f"- {item['match_name']} | {item['selection']} | {item['result'].upper()}")
    return "\n".join(lines)


def format_stats_block(name: str, stats: dict[str, float | int]) -> str:
    return (
        f"{name}\n"
        f"Total picks: {stats['total']}\n"
        f"Wins: {stats['wins']}\n"
        f"Losses: {stats['losses']}\n"
        f"Voids: {stats['voids']}\n"
        f"Pending: {stats['pending']}\n"
        f"Win rate: {stats['win_rate']}%"
    )


def format_help() -> str:
    return (
        "Bushy Bet Commands\n"
        "/start - Product intro and command list\n"
        "/today - Today's active football picks\n"
        "/results - Recent settled picks\n"
        "/stats - Performance statistics\n"
        "/fixtures - Upcoming real football fixtures\n"
        "/matchstats - Match statistics by fixture id\n"
        "/risk - Responsible betting guide\n"
        "/vip - VIP waitlist info\n"
        "/help - This guide"
    )


def format_start() -> str:
    return (
        "Welcome to Bushy Bet.\n"
        "Football picks with receipts.\n\n"
        "Bushy Bet shares football picks, match reasoning, and transparent public results.\n"
        "This is betting intelligence, not a sportsbook.\n\n"
        "Responsible reminder: 18+ only. Bet responsibly. No guaranteed wins.\n\n"
        + format_help()
    )


def format_risk() -> str:
    return (
        "Responsible Betting Rules\n"
        "1) 18+ only\n"
        "2) Bet responsibly\n"
        "3) No guaranteed wins\n"
        "4) Do not chase losses\n"
        "5) Use licensed platforms available in your region"
    )


def format_vip() -> str:
    return (
        "VIP interest is now open.\n"
        "Bushy Bet VIP tiers will launch after compliance and platform readiness checks.\n"
        "No payments are enabled in this slice."
    )


def format_fixtures(fixtures: list[dict[str, Any]]) -> str:
    if not fixtures:
        return "No fixtures available right now."

    lines = ["Upcoming Fixtures"]
    for fixture in fixtures:
        lines.append(
            f"- #{fixture['id']} {fixture['home_team']} vs {fixture['away_team']}"
            f" | {fixture['league']} | {fixture['kickoff_time']}"
        )
    return "\n".join(lines)


def format_match_stats(fixture_id: int, stats_rows: list[dict[str, Any]]) -> str:
    if not stats_rows:
        return f"Fixture {fixture_id}: Stats unavailable"

    lines = [f"Fixture {fixture_id} Stats"]
    for row in stats_rows[:20]:
        lines.append(f"- {row['stat_key']}: {row['stat_value']}")
    return "\n".join(lines)
