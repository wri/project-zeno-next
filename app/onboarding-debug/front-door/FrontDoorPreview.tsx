"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Grid,
  Heading,
  IconButton,
  Menu,
  Portal,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  ArrowRightIcon,
  GearSixIcon,
  PaperPlaneRightIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import MessageBubble from "@/app/components/MessageBubble";
import { toaster } from "@/app/components/ui/toaster";
import { API_CONFIG } from "@/app/config/api";
import type { ChatMessage } from "@/app/types/chat";
import {
  CompleteProfileMenuItem,
  EMPTY_PROFILE_ASK_RECORD,
  MAX_PROFILE_DISMISSALS,
  NTH_QUESTION_ASK,
  ProfileIncompleteDot,
  ProfileNudgeBanner,
  ProfilePromptCard,
  WelcomeConsent,
  continueUrl,
  pendingPrompt,
  recordAnswer,
  recordAskDismissed,
  recordAskShown,
  startNewSession,
  type ProfileAskRecord,
  type ProfileCardPatch,
} from "@/src/features/front-door";
import { MOCK_PROFILE_CONFIG } from "../mock-profile-config";
import { PERSONAS, type Persona, type PersonaId } from "./personas";

type Step = "entry" | "signin" | "welcome" | "app";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "entry", label: "Entry" },
  { id: "signin", label: "Sign in (RW)" },
  { id: "welcome", label: "Welcome" },
  { id: "app", label: "Chat" },
];

const ANSWER_DELAY_MS = 900;
const DISPLAY_ORIGIN = "https://www.globalnaturewatch.org";

const FIRST_ANSWER =
  "**Preview answer.** In the real app the agent picks Pará, loads tree cover loss data and answers here, with a chart on the map. This preview doesn't call the agent.";

function followUpAnswer(n: number): string {
  return `**Preview answer ${n}.** This preview doesn't call the agent.`;
}

function rwLoginUrl(search: string): string {
  const callback = `${DISPLAY_ORIGIN}/auth/callback?redirect=${encodeURIComponent(
    `${DISPLAY_ORIGIN}/app${search}`
  )}`;
  const url = new URL(`${API_CONFIG.RW_API_HOST}/auth/login`);
  url.searchParams.set("origin", "gnw");
  url.searchParams.set("callbackUrl", callback);
  url.searchParams.set("token", "true");
  return url.toString();
}

function simulatedUrl(step: Step, persona: Persona): string {
  switch (step) {
    case "entry":
      return persona.entry === "gfw"
        ? "https://www.globalforestwatch.org/map/country/BRA/14"
        : DISPLAY_ORIGIN;
    case "signin":
      return rwLoginUrl(persona.search);
    case "welcome":
      return `${DISPLAY_ORIGIN}/welcome${persona.search}`;
    case "app":
      return `${DISPLAY_ORIGIN}${continueUrl(persona.search)}`;
  }
}

const REAL_APP_NOTES: Record<Step, string> = {
  entry:
    "Both entry points link to /app?prompt=…. The question travels in the URL through every step that follows.",
  signin:
    "Unchanged: /app has no GNW token, so useAuthGuard sends the person to the Resource Watch login, which returns to /auth/callback with ?token=.",
  welcome:
    "New: shown when the person hasn't accepted the terms yet, instead of the /onboarding form. Continue would store terms_accepted_at and terms_version, then go to the URL above.",
  app: "/app no longer requires a complete profile. The question sends automatically; the profile is asked for after the answer.",
};

function nextAskLabel(
  record: ProfileAskRecord,
  profileComplete: boolean
): string {
  if (profileComplete) return "Never: profile complete";
  if (record.dismissals >= MAX_PROFILE_DISMISSALS) {
    return "Never in chat: 3 “Not now”s (menu item stays)";
  }
  if (record.lifetimeAnswers < 1) return "After the first answer";
  const later = `Answer ${NTH_QUESTION_ASK} of a later session`;
  if (record.askedThisSession) return later;
  if (record.sessionAnswers < NTH_QUESTION_ASK) {
    return `After answer ${NTH_QUESTION_ASK} this session`;
  }
  return later;
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4} fontSize="sm">
      <Text color="fg.muted">{label}</Text>
      <Text fontWeight="medium" textAlign="right">
        {value}
      </Text>
    </Flex>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={2}>
      <Text
        fontSize="xs"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wider"
        color="fg.muted"
      >
        {title}
      </Text>
      {children}
    </Stack>
  );
}

function GnwLandingEntry({
  prompt,
  onGo,
}: {
  prompt: string;
  onGo: () => void;
}) {
  return (
    <Stack
      gap={6}
      bg="hsla(225, 52%, 11%, 1)"
      color="white"
      rounded="lg"
      p={{ base: 6, md: 10 }}
      maxW="2xl"
      w="full"
      mx="auto"
    >
      <Text fontSize="xs" opacity={0.7}>
        GNW landing page (simplified)
      </Text>
      <Heading as="h2" size="2xl" fontWeight="normal" color="white">
        Global Nature Watch{" "}
        <Text as="span" fontWeight="bold">
          Horizon
        </Text>
      </Heading>
      <Box bg="bg" color="fg" rounded="xl" p={4}>
        <Text mb={4}>{prompt}</Text>
        <Flex justify="flex-end">
          <Button colorPalette="primary" rounded="lg" onClick={onGo}>
            Go
            <ArrowRightIcon />
          </Button>
        </Flex>
      </Box>
    </Stack>
  );
}

function GfwPanelEntry({ onGo }: { onGo: () => void }) {
  return (
    <Stack gap={3} maxW="2xl" w="full" mx="auto">
      <Text fontSize="xs" color="fg.muted">
        Global Forest Watch map panel (planned link, simplified)
      </Text>
      <Grid
        templateColumns={{ base: "1fr", md: "1fr 1fr" }}
        bg="bg"
        borderWidth="1px"
        borderColor="border"
        rounded="lg"
        overflow="hidden"
      >
        <Box
          minH={{ base: "120px", md: "260px" }}
          bg="bg.subtle"
          backgroundImage="repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,0.04) 8px 16px)"
        />
        <Stack gap={4} p={6}>
          <Heading as="h2" size="lg">
            Pará, Brazil
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            Tree cover loss, 2020–2024
          </Text>
          <Flex align="flex-end" gap={1.5} h="16" aria-hidden>
            {[45, 60, 95, 75, 62].map((h, i) => (
              <Box
                key={i}
                flex="1"
                h={`${h}%`}
                bg="bg.emphasized"
                roundedTop="sm"
              />
            ))}
          </Flex>
          <Button variant="outline" colorPalette="primary" onClick={onGo}>
            Ask Global Nature Watch about Pará
            <ArrowRightIcon />
          </Button>
        </Stack>
      </Grid>
    </Stack>
  );
}

function SignInPlaceholder({
  persona,
  onSignedIn,
}: {
  persona: Persona;
  onSignedIn: () => void;
}) {
  return (
    <Stack
      gap={4}
      bg="bg"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border.emphasized"
      rounded="lg"
      p={{ base: 6, md: 8 }}
      maxW="lg"
      w="full"
      mx="auto"
    >
      <Badge alignSelf="flex-start" variant="outline">
        Resource Watch, unchanged
      </Badge>
      <Heading as="h2" size="lg">
        Resource Watch sign-in happens here
      </Heading>
      <Text fontSize="sm" color="fg.muted">
        The real app sends people to the Resource Watch login page. This preview
        doesn&apos;t change or imitate that page.
      </Text>
      {persona.entry === "gfw" ? (
        <Text fontSize="sm">
          {persona.name.split(" ")[0]} already has a Resource Watch account from
          GFW. If Resource Watch still has a session for them, they come
          straight back without seeing a login form (unverified).
        </Text>
      ) : (
        <Text fontSize="sm">
          {persona.name.split(" ")[0]} picks Continue with Google. No email
          round trip.
        </Text>
      )}
      <Button colorPalette="primary" onClick={onSignedIn}>
        Continue as {persona.name}
        <ArrowRightIcon />
      </Button>
    </Stack>
  );
}

// Debug-only click-through of the proposed front door. Offline: no API calls,
// nothing is saved, and the Resource Watch login is represented, not imitated.
export default function FrontDoorPreview() {
  const [personaId, setPersonaId] = useState<PersonaId>("new");
  const persona = PERSONAS[personaId];
  const prompt = pendingPrompt(persona.search);

  const [step, setStep] = useState<Step>("entry");
  // The same record and policy functions the app uses, held in memory.
  const [record, setRecord] = useState<ProfileAskRecord>(
    EMPTY_PROFILE_ASK_RECORD
  );
  const [profileComplete, setProfileComplete] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [lastPatch, setLastPatch] = useState<ProfileCardPatch | null>(null);

  const idRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The simulated answer lands after a delay; it must see the ask state at
  // that moment (the person may click "Not now" while it's thinking).
  const recordRef = useRef(record);
  const profileCompleteRef = useRef(profileComplete);
  useEffect(() => {
    recordRef.current = record;
    profileCompleteRef.current = profileComplete;
  }, [record, profileComplete]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, thinking, cardOpen, bannerOpen]);

  const message = (type: "user" | "assistant", text: string): ChatMessage => {
    idRef.current += 1;
    return {
      id: `front-door-preview-${idRef.current}`,
      type,
      message: text,
      timestamp: new Date().toISOString(),
    };
  };

  const openCard = () => {
    setCardKey((k) => k + 1);
    setCardOpen(true);
    setBannerOpen(false);
  };

  const ask = (question: string) => {
    const userMessage = message("user", question);
    setMessages((m) => [...m, userMessage]);
    setThinking(true);
    timerRef.current = setTimeout(() => {
      const { record: counted, ask: moment } = recordAnswer(
        recordRef.current,
        profileCompleteRef.current
      );
      const answer = message(
        "assistant",
        counted.lifetimeAnswers === 1
          ? FIRST_ANSWER
          : followUpAnswer(counted.sessionAnswers)
      );
      setThinking(false);
      setMessages((m) => [...m, answer]);
      setRecord(moment ? recordAskShown(counted) : counted);
      if (moment === "first_answer") openCard();
      else if (moment === "nth_question") setBannerOpen(true);
    }, ANSWER_DELAY_MS);
  };

  const resetChat = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessages([]);
    setThinking(false);
    setCardOpen(false);
    setBannerOpen(false);
    setDraftQuestion("");
  };

  const resetAll = () => {
    resetChat();
    setRecord(EMPTY_PROFILE_ASK_RECORD);
    setProfileComplete(false);
    setLastPatch(null);
    setStep("entry");
  };

  const choosePersona = (id: PersonaId) => {
    setPersonaId(id);
    resetAll();
  };

  const goTo = (next: Step) => {
    if (next === "app") {
      resetChat();
      setStep("app");
      // The real /app sends ?prompt= on arrival.
      if (prompt) ask(prompt);
      return;
    }
    if (step === "app") resetChat();
    setStep(next);
  };

  const newSession = () => {
    resetChat();
    setRecord((r) => startNewSession(r));
    setStep("app");
  };

  const sendFollowUp = () => {
    const question = draftQuestion.trim();
    if (!question || thinking) return;
    setDraftQuestion("");
    setCardOpen(false);
    ask(question);
  };

  const saveProfile = (patch: ProfileCardPatch) => {
    setLastPatch(patch);
    setProfileComplete(true);
    setCardOpen(false);
    setBannerOpen(false);
    toaster.create({
      title: "Profile saved",
      description: "Preview only: nothing was sent.",
      type: "success",
      duration: 3000,
    });
  };

  const dismiss = () => {
    setRecord((r) => recordAskDismissed(r));
    setCardOpen(false);
    setBannerOpen(false);
  };

  return (
    <Box minH="100vh" bg="bg.muted">
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        bg="bg"
        borderBottomWidth="1px"
        borderColor="border"
        px={{ base: 4, md: 6 }}
        py={3}
      >
        <Stack gap={3}>
          <Flex gap={3} align="center" wrap="wrap">
            <Heading as="h1" size="md">
              Front door preview
            </Heading>
            <Badge colorPalette="orange" variant="subtle">
              Debug · offline · nothing is saved
            </Badge>
            <Button size="xs" variant="ghost" ml="auto" onClick={resetAll}>
              Reset
            </Button>
          </Flex>
          <Flex gap={2} wrap="wrap" align="center">
            <Text fontSize="xs" color="fg.muted" mr={1}>
              Person
            </Text>
            {Object.values(PERSONAS).map((p) => (
              <Button
                key={p.id}
                size="xs"
                rounded="full"
                variant={p.id === personaId ? "solid" : "outline"}
                colorPalette={p.id === personaId ? "primary" : undefined}
                onClick={() => choosePersona(p.id)}
              >
                {p.label}
              </Button>
            ))}
            <Text fontSize="xs" color="fg.muted">
              {persona.summary}
            </Text>
          </Flex>
          <Flex gap={1.5} wrap="wrap" align="center">
            <Text fontSize="xs" color="fg.muted" mr={1}>
              Step
            </Text>
            {STEPS.map((s, i) => (
              <Button
                key={s.id}
                size="xs"
                variant={s.id === step ? "subtle" : "ghost"}
                colorPalette={s.id === step ? "primary" : undefined}
                fontWeight={s.id === step ? "semibold" : "normal"}
                onClick={() => goTo(s.id)}
              >
                {i + 1}. {s.label}
              </Button>
            ))}
          </Flex>
        </Stack>
      </Box>

      <Grid
        templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 340px" }}
        gap={6}
        p={{ base: 4, md: 6 }}
        alignItems="start"
      >
        <Box
          bg={step === "app" ? "bg" : "bg.subtle"}
          borderWidth="1px"
          borderColor="border"
          rounded="lg"
          overflow="hidden"
          minH="640px"
          h={step === "app" ? { lg: "calc(100vh - 160px)" } : undefined}
          display="flex"
          flexDirection="column"
        >
          {step === "entry" && (
            <Flex flex="1" align="center" p={{ base: 4, md: 10 }}>
              {persona.entry === "gfw" ? (
                <GfwPanelEntry onGo={() => goTo("signin")} />
              ) : (
                <GnwLandingEntry
                  prompt={prompt ?? ""}
                  onGo={() => goTo("signin")}
                />
              )}
            </Flex>
          )}

          {step === "signin" && (
            <Flex flex="1" align="center" p={{ base: 4, md: 10 }}>
              <SignInPlaceholder
                persona={persona}
                onSignedIn={() => goTo("welcome")}
              />
            </Flex>
          )}

          {step === "welcome" && (
            <Flex flex="1" align="center" p={{ base: 4, md: 10 }}>
              <WelcomeConsent
                key={personaId}
                name={persona.name}
                pendingPrompt={prompt}
                signedInWithGfw={persona.entry === "gfw"}
                onContinue={() => goTo("app")}
              />
            </Flex>
          )}

          {step === "app" && (
            <>
              <Flex
                align="center"
                gap={3}
                px={4}
                h="56px"
                borderBottomWidth="1px"
                borderColor="border"
              >
                <Heading as="h2" size="sm" color="primary.fg">
                  Global Nature Watch{" "}
                  <Text as="span" fontWeight="normal">
                    Horizon
                  </Text>
                </Heading>
                <Menu.Root positioning={{ placement: "bottom-end" }}>
                  <Menu.Trigger asChild>
                    <Button
                      ml="auto"
                      variant="ghost"
                      size="sm"
                      gap={2}
                      color="fg.muted"
                    >
                      <UserIcon size={16} />
                      <Text truncate maxW="180px" fontSize="xs">
                        {persona.email}
                      </Text>
                      {!profileComplete && <ProfileIncompleteDot />}
                    </Button>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content>
                        {!profileComplete && (
                          <CompleteProfileMenuItem onSelect={openCard} />
                        )}
                        <Menu.Item value="settings" disabled>
                          <GearSixIcon />
                          Settings
                        </Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="logout" disabled color="fg.error">
                          <SignOutIcon />
                          Logout
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              </Flex>

              <Grid
                flex="1"
                templateColumns={{ base: "1fr", md: "minmax(0, 520px) 1fr" }}
                templateRows="minmax(0, 1fr)"
                minH={0}
              >
                <Flex
                  direction="column"
                  gap={4}
                  p={4}
                  borderRightWidth={{ base: 0, md: "1px" }}
                  borderColor="border"
                  minW={0}
                  minH={0}
                >
                  <Stack gap={4} flex="1" overflowY="auto" minH={0}>
                    {messages.length === 0 && !thinking && (
                      <Text color="fg.muted" fontSize="sm">
                        New session. Ask a question to start.
                      </Text>
                    )}
                    {messages.map((m, i) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        isFirst={i === 0}
                        isLast={i === messages.length - 1}
                      />
                    ))}
                    {thinking && (
                      <Flex
                        gap={2}
                        align="center"
                        color="fg.muted"
                        fontSize="sm"
                      >
                        <Spinner size="sm" />
                        Thinking…
                      </Flex>
                    )}
                    {cardOpen && (
                      <ProfilePromptCard
                        key={cardKey}
                        options={MOCK_PROFILE_CONFIG}
                        suggestion={persona.suggestion}
                        defaultCountry={persona.defaultCountry}
                        onSave={saveProfile}
                        onDismiss={dismiss}
                      />
                    )}
                    <div ref={chatEndRef} />
                  </Stack>

                  <Stack gap={2}>
                    {bannerOpen && (
                      <ProfileNudgeBanner
                        onOpen={openCard}
                        onDismiss={dismiss}
                      />
                    )}
                    <Flex
                      gap={2}
                      align="flex-end"
                      borderWidth="1px"
                      borderColor="border"
                      rounded="lg"
                      p={2}
                    >
                      <Textarea
                        id="front-door-preview-question"
                        aria-label="Ask a follow-up"
                        placeholder="Ask a follow-up…"
                        variant="flushed"
                        border="none"
                        autoresize
                        rows={1}
                        value={draftQuestion}
                        onChange={(e) => setDraftQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendFollowUp();
                          }
                        }}
                      />
                      <IconButton
                        aria-label="Send"
                        colorPalette="primary"
                        rounded="full"
                        size="sm"
                        disabled={!draftQuestion.trim() || thinking}
                        onClick={sendFollowUp}
                      >
                        <PaperPlaneRightIcon />
                      </IconButton>
                    </Flex>
                  </Stack>
                </Flex>
                <Flex
                  display={{ base: "none", md: "flex" }}
                  align="center"
                  justify="center"
                  bg="bg.subtle"
                  color="fg.muted"
                  fontSize="sm"
                >
                  Map (not rendered in this preview)
                </Flex>
              </Grid>
            </>
          )}
        </Box>

        <Stack
          gap={6}
          bg="bg"
          borderWidth="1px"
          borderColor="border"
          rounded="lg"
          p={5}
          position={{ lg: "sticky" }}
          top={{ lg: "140px" }}
        >
          <Heading as="h2" size="sm">
            Behind the scenes
          </Heading>

          <PanelSection title="URL in the real app">
            <Code
              fontSize="xs"
              p={2}
              whiteSpace="pre-wrap"
              wordBreak="break-all"
              display="block"
            >
              {simulatedUrl(step, persona)}
            </Code>
            <Text fontSize="sm" color="fg.muted">
              {REAL_APP_NOTES[step]}
            </Text>
          </PanelSection>

          <PanelSection title="When to ask for the profile">
            <StateRow
              label="Profile complete"
              value={profileComplete ? "Yes" : "No"}
            />
            <StateRow
              label="“Not now” clicks"
              value={`${record.dismissals} of ${MAX_PROFILE_DISMISSALS}`}
            />
            <StateRow
              label="Asked this session"
              value={record.askedThisSession ? "Yes" : "No"}
            />
            <StateRow
              label="Answers, all time"
              value={String(record.lifetimeAnswers)}
            />
            <StateRow
              label="Answers this session"
              value={String(record.sessionAnswers)}
            />
            <StateRow
              label="Next ask"
              value={nextAskLabel(record, profileComplete)}
            />
            <Button
              size="xs"
              variant="outline"
              alignSelf="flex-start"
              onClick={newSession}
            >
              Start a new session
            </Button>
          </PanelSection>

          <PanelSection title="Would send on save">
            {lastPatch ? (
              <>
                <Text fontSize="sm" color="fg.muted">
                  PATCH /api/auth/profile (partial update), plus the Ortto
                  submission.
                </Text>
                <Code
                  fontSize="xs"
                  p={2}
                  whiteSpace="pre"
                  display="block"
                  overflowX="auto"
                >
                  {JSON.stringify(lastPatch, null, 2)}
                </Code>
              </>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                Nothing yet. Save the profile card to see the payload.
              </Text>
            )}
          </PanelSection>
        </Stack>
      </Grid>
    </Box>
  );
}
