import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { LabButton } from "../components/LabButton";
import { PeacePadIcon, type PeacePadIconName } from "../components/PeacePadIcon";
import { ScreenHeader } from "../components/ScreenHeader";
import type { FamilyExpense, SupportResourceKind } from "../domain/parentCore";
import { colors, spacing, typography } from "../theme";
import { useParentCoreState } from "./ParentCoreState";
import { useAudioCallState } from "../calls/AudioCallState";
import { VideoStage } from "../calls/AudioCallScreen";

type Section = "children" | "money" | "support" | "calls" | "conch";

const sections: readonly Readonly<{ id: Section; label: string; icon: PeacePadIconName; color: string }>[] = [
  { id: "children", label: "Children", icon: "happy-outline", color: "#2E9D91" },
  { id: "money", label: "Expenses", icon: "receipt-outline", color: "#F26B5E" },
  { id: "support", label: "Support", icon: "heart-outline", color: "#6B4A86" },
  { id: "calls", label: "Call plans", icon: "calendar-outline", color: "#B16A00" },
  { id: "conch", label: "Conch", icon: "people-circle-outline", color: "#24766E" }
];

export function ParentCoreHubScreen() {
  const state = useParentCoreState();
  const [section, setSection] = useState<Section>("children");

  useEffect(() => {
    if (!state.hydrated && !state.busy) void state.reload().catch(() => undefined);
  }, [state.busy, state.hydrated, state.reload]);

  return (
    <View style={styles.stack}>
      <ScreenHeader
        accent={colors.aqua}
        icon="heart-circle-outline"
        kicker="Put the children first"
        softBackground="#DDF6F0"
        subtitle="Children, shared costs, support and calmer conversations in one warm place."
        title="Family tools"
      />
      <View accessibilityRole="tablist" style={styles.sectionGrid}>
        {sections.map((item) => {
          const active = section === item.id;
          return <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.id}
            onPress={() => setSection(item.id)}
            style={({ pressed }) => [styles.sectionButton, active ? { backgroundColor: item.color, borderColor: item.color } : null, pressed ? styles.pressed : null]}
          >
            <PeacePadIcon color={active ? colors.onBrand : item.color} name={item.icon} size={21} />
            <Text style={[styles.sectionLabel, active ? styles.sectionLabelActive : null]}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
      {!state.hydrated ? <View style={styles.loading}><ActivityIndicator color={colors.brand} /><Text style={styles.body}>Bringing your private family space up to date...</Text></View> : null}
      {state.error ? <View style={styles.errorCard}><Text accessibilityRole="alert" style={styles.error}>{state.error}</Text><LabButton label="Try again" onPress={() => void state.reload().catch(() => undefined)} variant="secondary" /></View> : null}
      {state.hydrated && section === "children" ? <ChildrenPanel /> : null}
      {state.hydrated && section === "money" ? <ExpensesPanel /> : null}
      {state.hydrated && section === "support" ? <SupportPanel /> : null}
      {state.hydrated && section === "calls" ? <ScheduledCallsPanel /> : null}
      {state.hydrated && section === "conch" ? <ConchPanel /> : null}
    </View>
  );
}

function ChildrenPanel() {
  const state = useParentCoreState();
  const [name, setName] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<string>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const selected = selectedChildId ?? state.children[0]?.id;

  return <View style={styles.panel}>
    <SectionHeading color={colors.aqua} icon="happy-outline" subtitle="Use a first name, nickname, or label that feels right for your family." title="Children and updates" />
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>Add a child profile</Text>
      <TextInput accessibilityLabel="Child name or label" autoCapitalize="words" maxLength={80} onChangeText={setName} placeholder="First name, nickname, or label" style={styles.input} value={name} />
      <LabButton disabled={state.busy || name.trim().length < 2} label="Add child" onPress={() => void state.createChild(name).then(() => setName("")).catch(() => undefined)} />
    </View>
    {state.children.length ? <>
      <View style={styles.chips}>
        {state.children.map((child) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === child.id }} key={child.id} onPress={() => setSelectedChildId(child.id)} style={[styles.chip, selected === child.id ? styles.chipActive : null]}><Text style={[styles.chipText, selected === child.id ? styles.chipTextActive : null]}>{child.displayName}</Text></Pressable>)}
      </View>
      <View style={[styles.formCard, styles.aquaCard]}>
        <Text style={styles.cardTitle}>Share a useful update</Text>
        <TextInput accessibilityLabel="Update title" maxLength={100} onChangeText={setTitle} placeholder="School note, handover, health update..." style={styles.input} value={title} />
        <TextInput accessibilityLabel="Update details" maxLength={1500} multiline onChangeText={setBody} placeholder="Keep it factual and child-focused." style={[styles.input, styles.multiline]} value={body} />
        <LabButton disabled={state.busy || !selected || title.trim().length < 2 || body.trim().length < 2} label="Save update" onPress={() => selected ? void state.createChildUpdate(selected, title, body).then(() => { setTitle(""); setBody(""); }).catch(() => undefined) : undefined} />
      </View>
    </> : <WarmEmpty icon="leaf-outline" title="Start privately, at your own pace" body="You can add a child profile without inviting anyone. It stays in your private workspace until you deliberately share an update." />}
    {state.updates.map((update) => <View key={update.id} style={styles.listCard}><Text style={styles.cardTitle}>{update.title}</Text><Text style={styles.body}>{update.body}</Text><Text style={styles.caption}>{new Date(update.occurredAt).toLocaleString()} · {update.visibility.scope === "private" ? "Private" : "Shared"}</Text></View>)}
  </View>;
}

function ExpensesPanel() {
  const state = useParentCoreState();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<Readonly<{ originalFileName: string; mediaType: "image/jpeg" | "image/png" | "application/pdf"; bytes: ArrayBuffer }> | null>(null);
  const [receiptName, setReceiptName] = useState("");
  const amountMinor = Math.round(Number(amount) * 100);
  const chooseReceipt = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ["image/jpeg", "image/png", "application/pdf"] });
    if (result.canceled) return;
    const selected = result.assets[0];
    const mediaType = selected.mimeType;
    if (!selected?.name || !mediaType || !["image/jpeg", "image/png", "application/pdf"].includes(mediaType)) throw new Error("Choose a JPG, PNG, or PDF receipt.");
    const bytes = await new File(selected.uri).arrayBuffer();
    if (!bytes.byteLength) throw new Error("That receipt file is empty.");
    setReceipt({ originalFileName: selected.name, mediaType: mediaType as "image/jpeg" | "image/png" | "application/pdf", bytes });
    setReceiptName(selected.name);
  };

  return <View style={styles.panel}>
    <SectionHeading color={colors.coral} icon="receipt-outline" subtitle="Keep child-related costs clear, with receipts and deliberate settlement requests." title="Shared expenses" />
    <View style={[styles.balanceCard, { backgroundColor: Number(state.balance?.netMinor ?? 0) >= 0 ? "#DDF6F0" : "#FFE4D6" }]}>
      <Text style={styles.eyebrow}>CURRENT BALANCE</Text>
      <Text style={styles.balance}>{formatMoney(state.balance?.netMinor ?? 0)}</Text>
      <Text style={styles.caption}>{(state.balance?.netMinor ?? 0) >= 0 ? "Pending amount owed to you" : "Pending amount you owe"}</Text>
    </View>
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>Record an expense</Text>
      <TextInput accessibilityLabel="Expense title" maxLength={120} onChangeText={setTitle} placeholder="School supplies, activity fee..." style={styles.input} value={title} />
      <TextInput accessibilityLabel="Amount in Canadian dollars" inputMode="decimal" onChangeText={setAmount} placeholder="0.00 CAD" style={styles.input} value={amount} />
      <LabButton disabled={state.busy} label={receipt ? "Replace receipt" : "Attach receipt (optional)"} onPress={() => void chooseReceipt().catch(() => undefined)} variant="secondary" />
      {receiptName ? <Text accessibilityLiveRegion="polite" style={styles.caption}>Receipt ready: {receiptName}</Text> : null}
      <LabButton disabled={state.busy || title.trim().length < 2 || !Number.isSafeInteger(amountMinor) || amountMinor <= 0} label="Save expense" onPress={() => void state.createExpense({ title, amountMinor, category: "other", receipt: receipt ?? undefined }).then(() => { setTitle(""); setAmount(""); setReceipt(null); setReceiptName(""); }).catch(() => undefined)} />
    </View>
    {!state.expenses.length ? <WarmEmpty icon="wallet-outline" title="No expenses recorded" body="Private expenses stay yours. When another parent is connected, you can choose to request a settlement." /> : null}
    {state.expenses.map((expense) => <ExpenseCard expense={expense} key={expense.id} />)}
  </View>;
}

function ExpenseCard({ expense }: { expense: FamilyExpense }) {
  const state = useParentCoreState();
  const existingSettlement = state.settlements.find((item) => item.expenseId === expense.id && item.status === "pending");
  return <View style={styles.listCard}>
    <View style={styles.rowBetween}><Text style={styles.cardTitle}>{expense.title}</Text><Text style={styles.money}>{formatMoney(expense.amountMinor)}</Text></View>
    <Text style={styles.caption}>{expense.category} · {new Date(expense.incurredAt).toLocaleDateString()} · {expense.status}</Text>
    {expense.receiptAttachmentId ? <LabButton disabled={state.busy} label="Open attached receipt" onPress={() => void state.openExpenseReceipt(expense.receiptAttachmentId!).then((url) => Linking.openURL(url)).catch(() => undefined)} variant="secondary" /> : null}
    {!existingSettlement && expense.status === "open" ? <LabButton disabled={state.busy || !state.otherParentIdentityId} label={state.otherParentIdentityId ? "Request settlement" : "Connect a parent to settle"} onPress={() => void state.requestSettlement(expense).catch(() => undefined)} variant="secondary" /> : null}
    {existingSettlement && existingSettlement.requestedFromIdentityId === state.balance?.identityId ? <View style={styles.inlineActions}><LabButton disabled={state.busy} label="Confirm" onPress={() => void state.resolveSettlement(existingSettlement, "confirmed").catch(() => undefined)} /><LabButton disabled={state.busy} label="Dispute" onPress={() => void state.resolveSettlement(existingSettlement, "disputed").catch(() => undefined)} variant="secondary" /></View> : null}
  </View>;
}

function SupportPanel() {
  const state = useParentCoreState();
  const [query, setQuery] = useState(state.supportQuery);
  const [kind, setKind] = useState<SupportResourceKind | undefined>();
  const kinds: readonly Readonly<{ id?: SupportResourceKind; label: string }>[] = [{ label: "All" }, { id: "parenting", label: "Parenting" }, { id: "counselling", label: "Counselling" }, { id: "legal", label: "Legal" }, { id: "crisis", label: "Safety" }];
  return <View style={styles.panel}>
    <SectionHeading color={colors.brand} icon="heart-outline" subtitle="PeacePad only uses a location you enter or explicitly allow. Provider failures stay visible." title="Support near you" />
    <View style={[styles.formCard, styles.supportCard]}>
      <TextInput accessibilityLabel="City or postal code" autoCapitalize="words" onChangeText={setQuery} placeholder="City or postal code" style={styles.input} value={query} />
      <View style={styles.chips}>{kinds.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: kind === item.id }} key={item.label} onPress={() => setKind(item.id)} style={[styles.chip, kind === item.id ? styles.chipActive : null]}><Text style={[styles.chipText, kind === item.id ? styles.chipTextActive : null]}>{item.label}</Text></Pressable>)}</View>
      <LabButton disabled={state.busy || query.trim().length < 2} label="Find support" onPress={() => void state.searchSupport(query, kind).catch(() => undefined)} />
    </View>
    {state.supportQuery && !state.supportResources.length && !state.busy && !state.error ? <WarmEmpty icon="search-outline" title="No verified matches yet" body="Try a nearby city or a broader support type. PeacePad will not invent provider results." /> : null}
    {state.supportResources.map((resource) => <View key={resource.providerId} style={styles.listCard}><View style={styles.rowBetween}><Text style={styles.cardTitle}>{resource.name}</Text>{resource.emergency ? <Text style={styles.urgent}>URGENT</Text> : null}</View><Text style={styles.body}>{resource.description}</Text><Text style={styles.caption}>{[resource.locality, resource.subdivision, resource.distanceKm === null ? null : `${resource.distanceKm.toFixed(1)} km`].filter(Boolean).join(" · ")}</Text>{resource.phone ? <LabButton label={`Call ${resource.phone}`} onPress={() => void Linking.openURL(`tel:${resource.phone}`)} variant="secondary" /> : null}{resource.website ? <LabButton label="Open provider website" onPress={() => void Linking.openURL(resource.website!)} variant="secondary" /> : null}</View>)}
  </View>;
}

function ScheduledCallsPanel() {
  const state = useParentCoreState();
  const [when, setWhen] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16).replace("T", " "));
  const [note, setNote] = useState("");
  const [mediaType, setMediaType] = useState<"audio" | "video">("video");
  const parsed = useMemo(() => parseLocalDateTime(when), [when]);
  return <View style={styles.panel}>
    <SectionHeading color={colors.sun} icon="calendar-outline" subtitle="Agree on a time before the phone rings. Both parents see the same saved plan." title="Scheduled calls" />
    <View style={[styles.formCard, styles.sunCard]}>
      <View style={styles.chips}>{(["audio", "video"] as const).map((type) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: mediaType === type }} key={type} onPress={() => setMediaType(type)} style={[styles.chip, mediaType === type ? styles.chipActive : null]}><Text style={[styles.chipText, mediaType === type ? styles.chipTextActive : null]}>{type === "video" ? "Video call" : "Audio call"}</Text></Pressable>)}</View>
      <TextInput accessibilityLabel="Call date and time" onChangeText={setWhen} placeholder="YYYY-MM-DD HH:mm" style={styles.input} value={when} />
      <TextInput accessibilityLabel="Optional call note" maxLength={240} onChangeText={setNote} placeholder="Optional child-focused note" style={styles.input} value={note} />
      <LabButton disabled={state.busy || !parsed || !state.otherParentIdentityId} label={state.otherParentIdentityId ? "Schedule call" : "Connect a parent to schedule"} onPress={() => parsed ? void state.scheduleCall(parsed, mediaType, note).then(() => setNote("")).catch(() => undefined) : undefined} />
    </View>
    {state.scheduledCalls.map((call) => <View key={call.id} style={styles.listCard}><View style={styles.rowBetween}><Text style={styles.cardTitle}>{call.mediaType === "video" ? "Video call" : "Audio call"}</Text><PeacePadIcon color={call.mediaType === "video" ? colors.coral : colors.aqua} name={call.mediaType === "video" ? "videocam-outline" : "call-outline"} /></View><Text style={styles.body}>{new Date(call.startsAt).toLocaleString()}</Text>{call.note ? <Text style={styles.caption}>{call.note}</Text> : null}{call.status === "scheduled" ? <LabButton disabled={state.busy} label="Cancel call" onPress={() => void state.cancelScheduledCall(call).catch(() => undefined)} variant="secondary" /> : <Text style={styles.caption}>{call.status}</Text>}</View>)}
  </View>;
}

function ConchPanel() {
  const state = useParentCoreState();
  const media = useAudioCallState();
  const session = state.conchSession;
  const [summaryDraft, setSummaryDraft] = useState("");
  useEffect(() => setSummaryDraft(state.conchSummary?.body ?? ""), [state.conchSummary?.body]);
  const startConch = async (mediaType: "audio" | "video") => {
    await state.createConch(mediaType);
    await media.start(mediaType);
  };
  const acceptConch = async () => {
    await state.acceptConch();
    if (media.call?.status === "ringing" && media.incoming) await media.accept();
    else await media.refresh();
  };
  const endConch = async () => {
    await state.endConch();
    if (media.call && !["declined", "ended", "expired"].includes(media.call.status)) await media.end();
  };
  return <View style={styles.panel}>
    <SectionHeading color={colors.aqua} icon="people-circle-outline" subtitle="One voice at a time, with explicit consent and no covert recording or transcript." title="Conch conversation" />
    {!session ? <View style={[styles.formCard, styles.aquaCard]}><Text style={styles.cardTitle}>Start a structured conversation</Text><Text style={styles.body}>Choose audio or video. The other parent can accept or decline; neither media nor a transcript is stored.</Text><View style={styles.inlineActions}><LabButton disabled={state.busy || media.busy || !state.otherParentIdentityId} label="Audio Conch" onPress={() => void startConch("audio").catch(() => undefined)} variant="secondary" /><LabButton disabled={state.busy || media.busy || !state.otherParentIdentityId} label="Video Conch" onPress={() => void startConch("video").catch(() => undefined)} /></View></View> : <View style={styles.conchCard}><Text style={styles.eyebrow}>{session.status.toUpperCase()}</Text><Text style={styles.balance}>{session.currentSpeakerIdentityId === state.actorIdentityId ? "Your turn" : session.status === "active" ? "Listen with care" : session.createdByIdentityId === state.actorIdentityId ? "Waiting for the other parent" : "Invitation ready"}</Text><Text style={styles.body}>{session.turnDurationSeconds} seconds per turn · {session.mediaType} · no recording</Text>{session.status === "invited" && session.createdByIdentityId !== state.actorIdentityId ? <LabButton disabled={state.busy || media.busy} label="Accept and begin" onPress={() => void acceptConch().catch(() => undefined)} /> : null}{session.status === "active" && session.currentSpeakerIdentityId === state.actorIdentityId ? <LabButton disabled={state.busy} label="Pass the Conch" onPress={() => void state.passConch().catch(() => undefined)} /> : null}{media.call?.type === "video" && media.call.status === "active" ? <VideoStage cameraEnabled={media.cameraEnabled} localStreamUrl={media.localStreamUrl} remoteStreamUrl={media.remoteStreamUrl} /> : null}{media.call?.status === "active" ? <View style={styles.inlineActions}><LabButton disabled={media.busy || media.mediaState === "unavailable"} label={media.muted ? "Unmute" : "Mute"} onPress={media.toggleMute} variant="secondary" />{media.call.type === "video" ? <LabButton disabled={media.busy || media.mediaState === "unavailable"} label={media.cameraEnabled ? "Camera off" : "Camera on"} onPress={media.toggleCamera} variant="secondary" /> : null}</View> : null}{session.status !== "ended" ? <LabButton disabled={state.busy || media.busy} label="End safely" onPress={() => void endConch().catch(() => undefined)} variant="secondary" /> : null}</View>}
    {session?.status === "active" ? <View style={styles.formCard}>
      <Text accessibilityLiveRegion="polite" style={styles.balance}>{Math.floor(state.turnSecondsRemaining / 60).toString().padStart(2, "0")}:{(state.turnSecondsRemaining % 60).toString().padStart(2, "0")}</Text>
      <Text style={styles.caption}>Current turn timer is synchronized from the shared session.</Text>
      <View style={styles.chips}>{([['heard', 'I hear you'], ['agree', 'Agreed'], ['pause', 'Pause'], ['needs-clarification', 'Clarify']] as const).map(([reaction, label]) => <Pressable accessibilityRole="button" disabled={state.busy || !state.conchTurn} key={reaction} onPress={() => void state.reactToConch(reaction).catch(() => undefined)} style={styles.chip}><Text style={styles.chipText}>{label}</Text></Pressable>)}</View>
      <LabButton disabled={state.busy} label={session.summaryConsentIdentityIds.includes(state.actorIdentityId) ? "Withdraw summary consent" : "Consent to a private summary"} onPress={() => void state.setConchSummaryConsent(!session.summaryConsentIdentityIds.includes(state.actorIdentityId)).catch(() => undefined)} variant="secondary" />
      <Text style={styles.caption}>{session.summaryConsentIdentityIds.length}/2 parents have consented. A summary remains unavailable until both choose yes.</Text>
      {session.participantIdentityIds.every((identityId) => session.summaryConsentIdentityIds.includes(identityId)) ? <View accessibilityLabel="Agreed Conch summary" style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Shared takeaway</Text>
        <Text style={styles.caption}>Write only the practical agreement you both want to keep. No call audio or transcript is used.</Text>
        <TextInput accessibilityLabel="Conch summary wording" maxLength={1000} multiline onChangeText={setSummaryDraft} placeholder="Example: We agreed to confirm Sunday pickup by Friday evening." style={[styles.input, styles.multiline]} value={summaryDraft} />
        <LabButton disabled={state.busy || !summaryDraft.trim() || summaryDraft.trim() === state.conchSummary?.body} label={state.conchSummary ? "Update shared takeaway" : "Save shared takeaway"} onPress={() => void state.saveConchSummary(summaryDraft).catch(() => undefined)} />
      </View> : null}
    </View> : null}
    <View style={styles.privacyNote}><PeacePadIcon color={colors.aqua} name="shield-checkmark-outline" /><Text style={styles.caption}>A summary can only be created after both participants deliberately consent. PeacePad never diagnoses either parent.</Text></View>
  </View>;
}

function SectionHeading({ color, icon, subtitle, title }: { color: any; icon: PeacePadIconName; subtitle: string; title: string }) {
  return <View style={styles.sectionHeading}><View style={[styles.iconTile, { backgroundColor: color }]}><PeacePadIcon color={colors.onBrand} name={icon} size={24} /></View><View style={styles.headingCopy}><Text style={styles.heading}>{title}</Text><Text style={styles.body}>{subtitle}</Text></View></View>;
}

function WarmEmpty({ body, icon, title }: { body: string; icon: PeacePadIconName; title: string }) {
  return <View style={styles.empty}><PeacePadIcon color={colors.coral} name={icon} size={30} /><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{body}</Text></View>;
}

function formatMoney(minor: number) {
  return new Intl.NumberFormat("en-CA", { currency: "CAD", style: "currency" }).format(minor / 100);
}

function parseLocalDateTime(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  panel: { gap: spacing.md },
  sectionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sectionButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: spacing.xs, minHeight: 48, paddingHorizontal: spacing.md },
  sectionLabel: { ...typography.caption, color: colors.text, fontWeight: "800" },
  sectionLabelActive: { color: colors.onBrand },
  sectionHeading: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  iconTile: { alignItems: "center", borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  headingCopy: { flex: 1, gap: spacing.xs },
  heading: { ...typography.heading, color: colors.text },
  cardTitle: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  caption: { ...typography.caption, color: colors.muted },
  eyebrow: { ...typography.caption, color: colors.brand, fontWeight: "900", letterSpacing: 1.2 },
  formCard: { backgroundColor: "#FFFDF8", borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  aquaCard: { backgroundColor: "#E9F9F4", borderColor: "#B8E8D9" },
  sunCard: { backgroundColor: "#FFF7E0", borderColor: "#F0C940" },
  supportCard: { backgroundColor: colors.brandSoft },
  listCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  balanceCard: { borderRadius: 26, gap: spacing.xs, padding: spacing.lg },
  balance: { ...typography.title, color: colors.text },
  money: { ...typography.heading, color: colors.coral },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 52, padding: spacing.md },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.caption, color: colors.text, fontWeight: "800" },
  chipTextActive: { color: colors.onBrand },
  empty: { alignItems: "center", backgroundColor: colors.cream, borderRadius: 24, gap: spacing.sm, padding: spacing.xl },
  errorCard: { backgroundColor: colors.dangerSurface, borderColor: colors.dangerBorder, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  error: { ...typography.body, color: colors.dangerText, fontWeight: "800" },
  loading: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  urgent: { ...typography.caption, color: colors.dangerText, fontWeight: "900" },
  conchCard: { backgroundColor: "#DDF6F0", borderColor: "#76CCBE", borderRadius: 28, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  summaryCard: { backgroundColor: "#FFFDF8", borderColor: colors.warningBorder, borderRadius: 20, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  privacyNote: { alignItems: "center", backgroundColor: colors.cream, borderRadius: 20, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  pressed: { opacity: 0.75 }
});
