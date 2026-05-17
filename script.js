const filterButtons = document.querySelectorAll(".filter-btn");
const caseCards = document.querySelectorAll(".case-card");
const caseToggles = document.querySelectorAll(".case-toggle");
const analyzeBtn = document.querySelector("#analyzeBtn");
const scamText = document.querySelector("#scamText");
const riskFill = document.querySelector("#riskFill");
const riskSummary = document.querySelector("#riskSummary");
const flagList = document.querySelector("#flagList");
const questionText = document.querySelector("#questionText");
const answerButtons = document.querySelector("#answerButtons");
const quizFeedback = document.querySelector("#quizFeedback");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    caseCards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.hidden = !shouldShow;
    });
  });
});

caseToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".case-card");
    const isOpen = card.classList.toggle("open");
    button.textContent = isOpen ? "Hide case notes" : "View case notes";
  });
});

const checks = [
  {
    label: "Urgency or threat language",
    test: (text) => /urgent|immediately|suspended|blocked|verify now|30 minutes|limited time/i.test(text),
  },
  {
    label: "Sensitive data request",
    test: (text) => /otp|pin|cvv|password|card number|mfa|verification code/i.test(text),
  },
  {
    label: "Suspicious link or non-official domain",
    test: (text) => /http:\/\/|bit\.ly|tinyurl|login|verify|secure.*example|account.*update/i.test(text),
  },
  {
    label: "Generic greeting",
    test: (text) => /dear user|dear customer|valued customer/i.test(text),
  },
  {
    label: "Money or payment instruction",
    test: (text) => /pay|fee|transfer|wallet|bank account|investment|refund/i.test(text),
  },
  {
    label: "Remote access or installation pressure",
    test: (text) => /install|remote access|anydesk|teamviewer|screen share|download/i.test(text),
  },
];

function analyzeMessage() {
  const text = scamText.value.trim();
  const matched = checks.filter((check) => check.test(text));
  const score = Math.min(100, matched.length * 18);

  riskFill.style.width = `${score}%`;
  riskFill.style.background = score >= 70 ? "#b84f42" : score >= 38 ? "#c7862d" : "#2f765e";

  if (!text) {
    riskSummary.textContent = "Add a message to analyze.";
    flagList.innerHTML = "";
    return;
  }

  if (matched.length >= 4) {
    riskSummary.textContent = `High risk: ${matched.length} scam signals found. Treat this as suspicious.`;
  } else if (matched.length >= 2) {
    riskSummary.textContent = `Medium risk: ${matched.length} warning signs found. Verify before acting.`;
  } else {
    riskSummary.textContent = `Low visible risk: ${matched.length} warning sign found. Still verify unexpected messages.`;
  }

  flagList.innerHTML = matched.map((item) => `<li>${item.label}</li>`).join("");
}

analyzeBtn.addEventListener("click", analyzeMessage);
analyzeMessage();

const quizQuestions = [
  {
    question: "A caller says they are from your bank and asks for your OTP. What should you do?",
    answers: [
      { text: "Share it only if they know your name", correct: false },
      { text: "Refuse and contact the bank through an official number", correct: true },
      { text: "Send half of the OTP first", correct: false },
    ],
  },
  {
    question: "Which clue is strongest in a business email compromise attempt?",
    answers: [
      { text: "A vendor suddenly changes payment account details", correct: true },
      { text: "The email has a company logo", correct: false },
      { text: "The email is short", correct: false },
    ],
  },
  {
    question: "What should digital forensics protect first?",
    answers: [
      { text: "The original evidence and chain of custody", correct: true },
      { text: "A dramatic story about the attacker", correct: false },
      { text: "Only screenshots from social media", correct: false },
    ],
  },
];

let currentQuestion = 0;

function renderQuiz() {
  const item = quizQuestions[currentQuestion];
  questionText.textContent = item.question;
  quizFeedback.textContent = "";

  answerButtons.innerHTML = "";
  item.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = answer.text;
    button.addEventListener("click", () => {
      quizFeedback.textContent = answer.correct
        ? "Correct. Verification beats pressure."
        : "Not quite. The safest choice is the one that avoids trust-by-pressure.";
      quizFeedback.style.color = answer.correct ? "#2f765e" : "#b84f42";

      setTimeout(() => {
        currentQuestion = (currentQuestion + 1) % quizQuestions.length;
        renderQuiz();
      }, 1500);
    });
    answerButtons.appendChild(button);
  });
}

renderQuiz();
