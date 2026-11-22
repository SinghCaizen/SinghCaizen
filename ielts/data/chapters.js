/* =====================================================================
   IELTS STUDY WEBSITE — SAARA CONTENT SIRF IS EK FILE ME HAI
   =====================================================================
   HOW TO ADD A NEW CHAPTER (plain language):
   1. Neeche window.IELTS_CHAPTERS wali list me ek naya block jodo,
      pichhle block ke baad comma (,) lagana mat bhoolna.
   2. Har chapter me ye cheezein hoti hain:
        id          : chhota unique naam, sirf a-z 0-9 aur - (jaise "my-chapter")
        title       : chapter ka naam
        description : ek line me chapter kis baare me hai
        tags        : ["listening", "test"] jaise shabdon ki list
        videos      : [{ "title": "...", "type": "rumble" | "file", "url": "..." }]
        audios      : [{ "title": "...", "url": "..." }]
        pdfs        : [{ "title": "...", "url": "..." }]
   3. URL kya ho sakta hai:
        - Google Drive share link  -> apne aap direct play/preview me badal jayega
        - Seedha file link (.mp3 / .mp4 / .webm / .pdf)
        - Isi website ke media folder ka path, jaise "media/audio/ch1.mp3"
        - Rumble embed link (type: "rumble" rakho)
   4. File save karo aur page refresh karo. Bas, naya chapter aa jayega.
   ---------------------------------------------------------------------
   OPTIONAL SCHEDULE (window.IELTS_SCHEDULE):
   Kisi khaas date par khaas chapter fix karna ho to neeche wale
   schedule me date -> chapter ids likh do. Planner in dates ko
   hamesha samman dega (auto-generate inhe hilayega nahi).
   Example:
     "2026-11-23": ["speaking"],
     "2026-11-24": ["listening-test-audio"]
   ===================================================================== */

window.IELTS_CHAPTERS = [
  {
    "id": "writing-task1-charts",
    "title": "Writing Task 1: Charts & Diagrams",
    "description": "Bar charts, line graphs, pie charts, process diagrams and maps — with model Task 1 answers and a full Writing Task 1 book.",
    "tags": [
      "writing",
      "task 1",
      "charts"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "IELTS Bar and Line Graph",
        "url": "https://drive.google.com/file/d/1GyAou2NBZWE2br-8uK4MQpngHoqdUgDB/view?usp=sharing"
      },
      {
        "title": "IELTS Line and Bar Chart",
        "url": "https://drive.google.com/file/d/11Sm0OkxFpsjLkjMDMEC2L98Y_C1lFXLD/view?usp=sharing"
      },
      {
        "title": "IELTS Pie and Bar Chart",
        "url": "https://drive.google.com/file/d/181swcLJk8aiA6-wmpbjLwBi4Ca1US1ke/view?usp=sharing"
      },
      {
        "title": "IELTS Process Diagram",
        "url": "https://drive.google.com/file/d/1qvBmyyGWz-pzzbQA6hRsq0WEVOXc_wxo/view?usp=sharing"
      },
      {
        "title": "IELTS Line Graph Examples",
        "url": "https://drive.google.com/file/d/1aQy_SLoym1nqtaURL-aC3SCAd5n8eeNR/view?usp=sharing"
      },
      {
        "title": "IELTS Map — Model Task 1 Answer",
        "url": "https://drive.google.com/file/d/1oNYadtyiJduFlno-TL8SFZBSvEClLOap/view?usp=sharing"
      },
      {
        "title": "Writing Task 1 Book (MrNiner)",
        "url": "https://drive.google.com/file/d/1NiNFJfg4iWtPbfhgRbFLPrXyvgAGU-gN/view?usp=sharing"
      }
    ]
  },
  {
    "id": "grammar-murphy",
    "title": "Grammar: Murphy English Grammar in Use",
    "description": "Raymond Murphy's English Grammar in Use, 5th Edition — the Month 1 grammar book: tenses, articles, past simple vs present perfect, and it/there sentences.",
    "tags": [
      "grammar",
      "month 1"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "English Grammar in Use, 5th Edition (Raymond Murphy)",
        "url": "https://drive.google.com/file/d/1kt7H_k1ZO1_GEggYEkXKx6iOfEwT_s58/view?usp=sharing"
      }
    ]
  },
  {
    "id": "cambridge-practice",
    "title": "Cambridge Practice Books",
    "description": "Full Cambridge IELTS practice books with answers — Books 5, 6, 7, 8, 9, 17 and 18 for timed mock tests in all four skills.",
    "tags": [
      "cambridge",
      "mock tests",
      "practice"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "Cambridge IELTS 5 with Answers",
        "url": "https://drive.google.com/file/d/1ldw_L5ub_Yq8ATxHGsIbv13hdgBHoCkq/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 6 — Test 1",
        "url": "https://drive.google.com/file/d/1Nhyaq-1cR4mNhPNg1FC5Cx0lPfuyRxeX/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 6 — Test 2",
        "url": "https://drive.google.com/file/d/1SicFdzpd17txwNggxTyaCEoe7VkkEbDk/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 6 — Test 3",
        "url": "https://drive.google.com/file/d/1smH9CbkR0sclLjf4tka3Ebhp3ZpmZ1SY/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 6 — Test 4",
        "url": "https://drive.google.com/file/d/1d1BCuYvMavbyDbm4UjHLwp10dbDPnBzt/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 7",
        "url": "https://drive.google.com/file/d/17-Yk80blNv81Ca2YkTEhX7digggjFzlf/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 8",
        "url": "https://drive.google.com/file/d/1GIIkeyQdjqd5gFw-F8OC1cJZdl3yAVQl/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 9",
        "url": "https://drive.google.com/file/d/1eVxllSxaPemjeaFd6WvorPIcpOUYpMLu/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 17",
        "url": "https://drive.google.com/file/d/1TXoExkuCxwlFV9LRbOh9N9vswMqlPvTK/view?usp=sharing"
      },
      {
        "title": "Cambridge IELTS 18",
        "url": "https://drive.google.com/file/d/1gQe0jVxHVsFo4sP2Yh8vydvxNf3qo76t/view?usp=sharing"
      }
    ]
  },
  {
    "id": "writing-task2-essays",
    "title": "Writing Task 2: Essays",
    "description": "Essay structure, Band 9 model essays, and a pre-intermediate writing course — for the four official criteria: Task Response, Coherence & Cohesion, Lexical Resource, Grammar.",
    "tags": [
      "writing",
      "task 2",
      "essays"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "IELTS Writing Maximiser",
        "url": "https://drive.google.com/file/d/1cAhw4euuslpw8ktoXwduhc6NLT_pX154/view?usp=sharing"
      },
      {
        "title": "Band 9 Essays (Charles)",
        "url": "https://drive.google.com/file/d/1prDFb3RcwVXGq7RBOSAkAlNT6RpKQIrW/view?usp=sharing"
      },
      {
        "title": "Get Ready for IELTS Writing (Pre-Intermediate)",
        "url": "https://drive.google.com/file/d/10AcJT5orxDX0z6-53Drv17lf8KtmE6HW/view?usp=sharing"
      }
    ]
  },
  {
    "id": "listening-practice",
    "title": "Listening Practice",
    "description": "Listening strategies plus full practice test sets — 40 Listening Tests (Section 1, with answers) and 404 Essential Tests for IELTS.",
    "tags": [
      "listening",
      "practice tests"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "Listening Strategies for the IELTS Test",
        "url": "https://drive.google.com/file/d/1DUHkIgbw_ZskMrPXwNdeBIiggYY85kSw/view?usp=sharing"
      },
      {
        "title": "40 IELTS Listening Tests — Section 1 (with answers)",
        "url": "https://drive.google.com/file/d/14MfWQ2h5TERJFRddVxE1gYSLHe0QX1cP/view?usp=sharing"
      },
      {
        "title": "404 Essential Tests for IELTS",
        "url": "https://drive.google.com/file/d/1F62Y9pyuQDhl-VIydyQxLk23k0zWdtVD/view?usp=sharing"
      }
    ]
  },
  {
    "id": "reading-practice",
    "title": "Reading Practice",
    "description": "40 Reading Tests (Passage 1), every reading question type explained, and a pre-intermediate reading course.",
    "tags": [
      "reading",
      "practice tests"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "40 IELTS Reading Tests — Passage 1",
        "url": "https://drive.google.com/file/d/188NDiAuJvGh-nRHVSjr1fSvdmZsog-6z/view?usp=sharing"
      },
      {
        "title": "Reading Question Types (CEFR & IELTS)",
        "url": "https://drive.google.com/file/d/1pU_qjlHIRZcZnLeQD4J_p1GRNK8mntVo/view?usp=sharing"
      },
      {
        "title": "Get Ready for IELTS Reading (Pre-Intermediate)",
        "url": "https://drive.google.com/file/d/1eZIGM8SGU0O_ee1V7MFNUZuAfogvOYc2/view?usp=sharing"
      }
    ]
  },
  {
    "id": "speaking",
    "title": "Speaking",
    "description": "Speaking strategies by Rachel Mitchell and a pre-intermediate speaking course — for Part 1, Part 2 cue cards and Part 3 discussion.",
    "tags": [
      "speaking",
      "strategies"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "IELTS Speaking Strategies (Rachel Mitchell)",
        "url": "https://drive.google.com/file/d/1By-qBLQEx7Sj3oSE2FWiYVwCRr0wpiq3/view?usp=sharing"
      },
      {
        "title": "Get Ready for IELTS Speaking (Pre-Intermediate)",
        "url": "https://drive.google.com/file/d/1GRKAs0NrecX0PcxXZTgGUR_mswQK-lZ-/view?usp=sharing"
      }
    ]
  },
  {
    "id": "vocabulary-synonyms",
    "title": "Vocabulary & Synonyms",
    "description": "IELTS synonyms, fluent vocabulary and idioms — the words that lift Lexical Resource in Writing and Speaking.",
    "tags": [
      "vocabulary",
      "words"
    ],
    "videos": [],
    "audios": [],
    "pdfs": [
      {
        "title": "Synonyms for IELTS",
        "url": "https://drive.google.com/file/d/1nvcWXwk1dRi2KpVpJjtvP3wVS8sWnM5k/view?usp=sharing"
      },
      {
        "title": "English Vocabulary Fluent 2022",
        "url": "https://drive.google.com/file/d/1Qgf3UreiXrFxvuU4XhgzP1E5b993CH2R/view?usp=sharing"
      },
      {
        "title": "English Vocabulary Idioms 2022",
        "url": "https://drive.google.com/file/d/1WrbqITBwkbavws4UoRyDX_5GiOxk0kKL/view?usp=sharing"
      }
    ]
  },
  {
    "id": "listening-test-audio",
    "title": "Listening Test Audio: Tests 1–26",
    "description": "Full listening test recordings, Tests 1 to 26 — Tests 11–15 are split into their four sections. Play them here in the website's own audio player, with resume, speed control and bookmarks.",
    "tags": [
      "listening",
      "audio",
      "tests"
    ],
    "videos": [],
    "audios": [
      {
        "title": "Test 1",
        "url": "https://drive.google.com/file/d/1CjdAclThqxdnyirw512ux8qVsbLFxqgJ/view?usp=sharing"
      },
      {
        "title": "Test 2",
        "url": "https://drive.google.com/file/d/1vLwV2lHy4tulTSj4iJlIbZh_D13arDOM/view?usp=sharing"
      },
      {
        "title": "Test 3",
        "url": "https://drive.google.com/file/d/1pcGSAi2U8yKryWOVYJc7qcJ9eCJmsJB9/view?usp=sharing"
      },
      {
        "title": "Test 4",
        "url": "https://drive.google.com/file/d/1vXJcRPw8AgmRy2T-_i4ThUTL38rIHi-L/view?usp=sharing"
      },
      {
        "title": "Test 5",
        "url": "https://drive.google.com/file/d/17qRa259gRUAOfqUjN23QuYbNxc3cR2F1/view?usp=sharing"
      },
      {
        "title": "Test 6",
        "url": "https://drive.google.com/file/d/1eisL9B99peLZMpgSnr3RbSZa6QCSJMcR/view?usp=sharing"
      },
      {
        "title": "Test 7",
        "url": "https://drive.google.com/file/d/1KoLhtcgK4dWXleGmWrfWgGcBEDBud_9S/view?usp=sharing"
      },
      {
        "title": "Test 8",
        "url": "https://drive.google.com/file/d/1Bo28iACmZvZN4AdDsEniSPfzg8nBhIRD/view?usp=sharing"
      },
      {
        "title": "Test 9",
        "url": "https://drive.google.com/file/d/12HFhdzPVEqiCAUioNXkm-i2jACo0bodP/view?usp=sharing"
      },
      {
        "title": "Test 10",
        "url": "https://drive.google.com/file/d/1h11799gl2GE_fdpMpx5TV83ruH48Nrlo/view?usp=sharing"
      },
      {
        "title": "Test 11 · Section 1",
        "url": "https://drive.google.com/file/d/1t7lfhlAjtdL3Agm9EaSNlWDYr4m2TLZn/view?usp=sharing"
      },
      {
        "title": "Test 11 · Section 2",
        "url": "https://drive.google.com/file/d/17vzb3NrJhSgKHawXk7bu5IDpzgr1JqCF/view?usp=sharing"
      },
      {
        "title": "Test 11 · Section 3",
        "url": "https://drive.google.com/file/d/16fifFV34VmyjvsYzYNY7x5Z8CSWVl1pR/view?usp=sharing"
      },
      {
        "title": "Test 11 · Section 4",
        "url": "https://drive.google.com/file/d/14lmnsQeOilA7Z9X0eibMqttSV3w9RX-2/view?usp=sharing"
      },
      {
        "title": "Test 12 · Section 1",
        "url": "https://drive.google.com/file/d/1UOlHoLmW4BDhDJqDxynd-J_dret1vGiA/view?usp=sharing"
      },
      {
        "title": "Test 12 · Section 2",
        "url": "https://drive.google.com/file/d/1p3MQTfZP_jkKfDE8VPOYlSZNrIW1jjn4/view?usp=sharing"
      },
      {
        "title": "Test 12 · Section 3",
        "url": "https://drive.google.com/file/d/1w85R66C9s0FMlfxP8cTKuqDbend7VW1d/view?usp=sharing"
      },
      {
        "title": "Test 12 · Section 4",
        "url": "https://drive.google.com/file/d/1Pn7yeNaI-7ClhYps2wTTmGfSUX-DHXz7/view?usp=sharing"
      },
      {
        "title": "Test 13 · Section 1",
        "url": "https://drive.google.com/file/d/1j4ce4vS515fcQL0yfsWyQKUYB0QdEG9e/view?usp=sharing"
      },
      {
        "title": "Test 13 · Section 2",
        "url": "https://drive.google.com/file/d/11GddHRKGsk4V3_12LvSLIfnG2bvm4ZRT/view?usp=sharing"
      },
      {
        "title": "Test 13 · Section 3",
        "url": "https://drive.google.com/file/d/1t6do9xaFBAeZIKgGjojrSRRZKUic8pvE/view?usp=sharing"
      },
      {
        "title": "Test 13 · Section 4",
        "url": "https://drive.google.com/file/d/1enBQ6zpKCbfbe4NQxI9p8oM9aEFZpOwQ/view?usp=sharing"
      },
      {
        "title": "Test 14 · Section 1",
        "url": "https://drive.google.com/file/d/1jaMaCc7ggV2jDYp_hbo5lOUg39reBKD3/view?usp=sharing"
      },
      {
        "title": "Test 14 · Section 2",
        "url": "https://drive.google.com/file/d/15MwH5xAUSEYFU6oVM4Q0jhD_dpYTWjnd/view?usp=sharing"
      },
      {
        "title": "Test 14 · Section 3",
        "url": "https://drive.google.com/file/d/143514lBIUOS--zWCtI77ji-jkzE3Soj5/view?usp=sharing"
      },
      {
        "title": "Test 14 · Section 4",
        "url": "https://drive.google.com/file/d/1UBUfwodDxcjH2WLd2ZxO_A1DAfENjYrf/view?usp=sharing"
      },
      {
        "title": "Test 15 · Section 1",
        "url": "https://drive.google.com/file/d/1CudBQPrHrJidt2XDDyC4FF9IDMEQKexL/view?usp=sharing"
      },
      {
        "title": "Test 15 · Section 2",
        "url": "https://drive.google.com/file/d/1VW3Ib7M57qLc1WpASwusZxIlOjPrI7Cc/view?usp=sharing"
      },
      {
        "title": "Test 15 · Section 3",
        "url": "https://drive.google.com/file/d/1KdtG0XBRe5JUWxMIfjYFk1FO-jnR9iFI/view?usp=sharing"
      },
      {
        "title": "Test 15 · Section 4",
        "url": "https://drive.google.com/file/d/1ZdinDeAuCq3TjIvoXuHhXabCKEomqVoy/view?usp=sharing"
      },
      {
        "title": "Test 16",
        "url": "https://drive.google.com/file/d/10D5tQ9RIXns9NQaxeN-QiYeLFQtmsR-I/view?usp=sharing"
      },
      {
        "title": "Test 17",
        "url": "https://drive.google.com/file/d/15vxgKSDBe9HQEMpwRb83wwDH_9o7tkZ_/view?usp=sharing"
      },
      {
        "title": "Test 18",
        "url": "https://drive.google.com/file/d/1FO9lvir8GPM3XgDmdCfhPzADHCv1L73X/view?usp=sharing"
      },
      {
        "title": "Test 19",
        "url": "https://drive.google.com/file/d/1yYq7GlPFCP-iyZZqrduOnUGsiXcRIw-o/view?usp=sharing"
      },
      {
        "title": "Test 20",
        "url": "https://drive.google.com/file/d/1IVpcni_S_fsLxOzpn3r44wigT4JgE-ir/view?usp=sharing"
      },
      {
        "title": "Test 21",
        "url": "https://drive.google.com/file/d/1juk_1aIElYOrRBgsygUoHv3a0O-9pxzY/view?usp=sharing"
      },
      {
        "title": "Test 22",
        "url": "https://drive.google.com/file/d/1y-0H74aPQPIhvH6M2Lb-7aKb_sxO8L7E/view?usp=sharing"
      },
      {
        "title": "Test 23",
        "url": "https://drive.google.com/file/d/1-iPFexlRbcDZ_xBxpIA14SWubjMqB_zY/view?usp=sharing"
      },
      {
        "title": "Test 24",
        "url": "https://drive.google.com/file/d/142ZCeAJ0j7ilmTKQgZldwXSu5SS8qSFZ/view?usp=sharing"
      },
      {
        "title": "Test 25",
        "url": "https://drive.google.com/file/d/1X-hbQSSUCUfAQ-Rpn0tWcwIz7rZ2O9pY/view?usp=sharing"
      },
      {
        "title": "Test 26",
        "url": "https://drive.google.com/file/d/1TLy--6gjYzCkVClhfJabRkzE05NJM32p/view?usp=sharing"
      }
    ],
    "pdfs": []
  },
  {
    "id": "mindset-foundation",
    "title": "MindSet for IELTS Foundation",
    "description": "The MindSet for IELTS Foundation Student's Book with its full CD audio — Tracks 01 to 20, ready to play inside the website.",
    "tags": [
      "mindset",
      "foundation",
      "course book"
    ],
    "videos": [],
    "audios": [
      {
        "title": "Track 01",
        "url": "https://drive.google.com/file/d/1tlXW293X-Bw10YMmBEPJ7OHSL-zc1_U8/view?usp=sharing"
      },
      {
        "title": "Track 02",
        "url": "https://drive.google.com/file/d/1lNVB-gGtapxDOQd0DXOVip6NFtE0VOib/view?usp=sharing"
      },
      {
        "title": "Track 03",
        "url": "https://drive.google.com/file/d/1w19SHjwSRP4qa-qiaYGQpLVkHBdXqjp5/view?usp=sharing"
      },
      {
        "title": "Track 04",
        "url": "https://drive.google.com/file/d/1B4034XL7MrOGaEnQpCyWJJCpGjGV4LI7/view?usp=sharing"
      },
      {
        "title": "Track 05",
        "url": "https://drive.google.com/file/d/1VwQsddE-gjsX5YkhlQ0hX8fzd_JX7d00/view?usp=sharing"
      },
      {
        "title": "Track 06",
        "url": "https://drive.google.com/file/d/1CO2deEqTcsQe3qv8z1D0fDuAb7Cr27Cm/view?usp=sharing"
      },
      {
        "title": "Track 07",
        "url": "https://drive.google.com/file/d/167NEerQiaLcXKEFpmA0K2PJTjcYIv-3m/view?usp=sharing"
      },
      {
        "title": "Track 08",
        "url": "https://drive.google.com/file/d/1oBejEzZQD6KLL3yVSgzFahDP3_nlfF3C/view?usp=sharing"
      },
      {
        "title": "Track 09",
        "url": "https://drive.google.com/file/d/13IHzcPXHq_k9z7HxaVa7NeOTYjOmX-pL/view?usp=sharing"
      },
      {
        "title": "Track 10",
        "url": "https://drive.google.com/file/d/13EIdKSK7b2TMNO8tP31NKYBLroO4QVnK/view?usp=sharing"
      },
      {
        "title": "Track 11",
        "url": "https://drive.google.com/file/d/1JiaV8oYwmEDM2ro-qrl33tRCX1T_qmdh/view?usp=sharing"
      },
      {
        "title": "Track 12",
        "url": "https://drive.google.com/file/d/1YVqJx2lSPKoK6hXQu2ednsEBqKISIbJ8/view?usp=sharing"
      },
      {
        "title": "Track 13",
        "url": "https://drive.google.com/file/d/1jXzykHPq9XcDvOaYxcubFITMM_iBNQDr/view?usp=sharing"
      },
      {
        "title": "Track 14",
        "url": "https://drive.google.com/file/d/15uO7ScfNthIJ5CQoz6GHfXh27dNdQcqF/view?usp=sharing"
      },
      {
        "title": "Track 15",
        "url": "https://drive.google.com/file/d/142xM_pGnQLik4Ie3J4Yq6n8S-DFYc5ot/view?usp=sharing"
      },
      {
        "title": "Track 16",
        "url": "https://drive.google.com/file/d/1wxrED92VSTMUp1NERd0uf3rTCYhbkfkq/view?usp=sharing"
      },
      {
        "title": "Track 17",
        "url": "https://drive.google.com/file/d/13wnoFoQEAyEVEcTqVG3h7IeqwdJay5DO/view?usp=sharing"
      },
      {
        "title": "Track 18",
        "url": "https://drive.google.com/file/d/1lobj4lRe1GdEVXpEGiU9ppMJzk-NnNAA/view?usp=sharing"
      },
      {
        "title": "Track 19",
        "url": "https://drive.google.com/file/d/1TYoEBW18UTlpS30zeVh_RMK1QsteJiW4/view?usp=sharing"
      },
      {
        "title": "Track 20",
        "url": "https://drive.google.com/file/d/1OtTZJNVJECGTJQpBkfMrcrW_SGTYtHAJ/view?usp=sharing"
      }
    ],
    "pdfs": [
      {
        "title": "MindSet for IELTS Foundation Student's Book",
        "url": "https://drive.google.com/file/d/1ezAHZO8aSBuSw-5N8uHz_X9bWMaW-cGL/view?usp=sharing"
      }
    ]
  },
  {
    "id": "writing-video-course",
    "title": "Video Course: IELTS Writing (Full)",
    "description": "Poora Writing video course, lesson 001 se 033 tak — Task 2 model answers, planning, grammar, demo essays — plus Coherence & Cohesion aur Grammar wale extra lessons.",
    "tags": [
      "writing",
      "video",
      "course",
      "task 2"
    ],
    "videos": [
      {
        "title": "001 An Introduction to the Course",
        "type": "file",
        "url": "https://drive.google.com/file/d/1PY8Nru9kP904cTHoAx5ZesAte2omwC4q/view"
      },
      {
        "title": "002 An Introduction to the IELTS Exam with Walkthrough",
        "type": "file",
        "url": "https://drive.google.com/file/d/13Y-AvCAjm6_H60F4oX0xu5u9fwqv_OvA/view"
      },
      {
        "title": "003 Understanding Writing Task 2",
        "type": "file",
        "url": "https://drive.google.com/file/d/1ysescWOBl05aBul-imXIVsRU2B0ziUHe/view"
      },
      {
        "title": "006 Top Marks - A Brief Look at a Task 2 Model Answer",
        "type": "file",
        "url": "https://drive.google.com/file/d/1B9R6msi18299D0eSIcwuqAALvfrTmYkF/view"
      },
      {
        "title": "007 Planning Your Essay",
        "type": "file",
        "url": "https://drive.google.com/file/d/1SXBEsZ71W2tjBaqgmrHrpEqKh0Yr7LMz/view"
      },
      {
        "title": "008 Handling Time Constraints and Word Counts",
        "type": "file",
        "url": "https://drive.google.com/file/d/1vN8-hnaRJ0SKkjJpGDcMqeS0vtrr-2jN/view"
      },
      {
        "title": "009 Dont Make These Mistakes",
        "type": "file",
        "url": "https://drive.google.com/file/d/1RRxpNnGYzSKFr6ysEuaomNExnMun8KLa/view"
      },
      {
        "title": "010 Incredibly Fast Introductions",
        "type": "file",
        "url": "https://drive.google.com/file/d/1TyFsQXmS0mlm7YvnpiRRZPMyOL-AlTVn/view"
      },
      {
        "title": "011 Building Body Paragraphs",
        "type": "file",
        "url": "https://drive.google.com/file/d/1rXW67C-3s2855aGrMBI9w95f9c4XyOYU/view"
      },
      {
        "title": "012 Quick Conclusions",
        "type": "file",
        "url": "https://drive.google.com/file/d/1FpHwDY2_GNd8fvLXe3uZtNcc6LpdqX6N/view"
      },
      {
        "title": "013 Cohesive Devices and Referencing",
        "type": "file",
        "url": "https://drive.google.com/file/d/1nWLxCUfn_lcdjWGuU04ujTwICEvHMUvi/view"
      },
      {
        "title": "014 Finding Ideas",
        "type": "file",
        "url": "https://drive.google.com/file/d/1xwgo_n4VPdcFLNla4rb_gfNFI40lsVXT/view"
      },
      {
        "title": "015 Developing Ideas and Using Examples",
        "type": "file",
        "url": "https://drive.google.com/file/d/1fjRvJkFIRMkfbLw8uwGhsqzgt6qve4Xj/view"
      },
      {
        "title": "016 Creating and Maintaining a Position",
        "type": "file",
        "url": "https://drive.google.com/file/d/19vEumBUOM55RKJNJhBVjUGlYAtEinuLn/view"
      },
      {
        "title": "017 Stop Making Generalisations",
        "type": "file",
        "url": "https://drive.google.com/file/d/1RD8HJW51dGh06xx-R7f9aKqjFBa-0RK5/view"
      },
      {
        "title": "018 Whats Your Topic",
        "type": "file",
        "url": "https://drive.google.com/file/d/1Yemu_927v06vlpGmCC9IdREcjfeIr9Y1/view"
      },
      {
        "title": "019 The Importance of Collocations",
        "type": "file",
        "url": "https://drive.google.com/file/d/1bG8NWUuVP6AgrUXxrNiMXy1mbHA39W1B/view"
      },
      {
        "title": "020 Word Formation",
        "type": "file",
        "url": "https://drive.google.com/file/d/1ViAvFakNSAUsM69LuLza9oBTVYqbTeAD/view"
      },
      {
        "title": "021 Synonyms and Paraphrasing",
        "type": "file",
        "url": "https://drive.google.com/file/d/1KCSqV0qcjIakEACrglL10HIihV9ka35y/view"
      },
      {
        "title": "022 Simple Sentences and Common Errors",
        "type": "file",
        "url": "https://drive.google.com/file/d/1j5RXWIWjykAlRNYnL8qF8eDHUGw3gLjT/view"
      },
      {
        "title": "023 What Makes a Complex Sentence",
        "type": "file",
        "url": "https://drive.google.com/file/d/1X6dAB-mWBJufZ1sxqjmr5Kb3o_o5DZZi/view"
      },
      {
        "title": "024 Punctuation",
        "type": "file",
        "url": "https://drive.google.com/file/d/1pNgqiK5O2nXDbN6AHMT2Y4vrYhe83ghH/view"
      },
      {
        "title": "025 Conditional Sentences",
        "type": "file",
        "url": "https://drive.google.com/file/d/1yPSCZU3ToHH1EWODasxn-ADR3l_g9ros/view"
      },
      {
        "title": "026 Relative Clauses",
        "type": "file",
        "url": "https://drive.google.com/file/d/1lOecvOJ51vh_maU6TSi_JYdEPPbm1TEE/view"
      },
      {
        "title": "027 Checking The Essay Articles  Prepositions  Pronouns",
        "type": "file",
        "url": "https://drive.google.com/file/d/1m7z37OLqFzfJuuf_-iHpT5L-MDlAM4Bf/view"
      },
      {
        "title": "028 Demo Answering Task 2 From Start to Finish - PART 1",
        "type": "file",
        "url": "https://drive.google.com/file/d/1CWpQyA1n7d1qeQ1kqyxQlDpeMrUkqBiY/view"
      },
      {
        "title": "029 Demo Answering Task 2 From Start to Finish - PART 2",
        "type": "file",
        "url": "https://drive.google.com/file/d/1R3JxwlIoA9URaoFf03-aaNdI9Q2F5-og/view"
      },
      {
        "title": "030 Secrets to Success - Tips and Techniques",
        "type": "file",
        "url": "https://drive.google.com/file/d/1AagfYJpmSouGOrQjlhlY2hTjNrbS6S8H/view"
      },
      {
        "title": "031 How to Practice Effectively",
        "type": "file",
        "url": "https://drive.google.com/file/d/167YKW1JNfCWy9xQjMCtY5LZY1TZu8PLz/view"
      },
      {
        "title": "032 Getting Guidance",
        "type": "file",
        "url": "https://drive.google.com/file/d/10llnprrsKSheixXVAnCAawNUNteI7sxX/view"
      },
      {
        "title": "033 Good Luck",
        "type": "file",
        "url": "https://drive.google.com/file/d/1Ti5-PVvFvYSg54Ye4ei6s6JiDyCNVWgs/view"
      },
      {
        "title": "2 IELTS Writing Coherence & Cohesion Improve your English & IELTS",
        "type": "file",
        "url": "https://drive.google.com/file/d/1x2VaK26WSUfiH-lKy1LS0aDUVjVPuzTW/view"
      },
      {
        "title": "3 IELTS Writing Grammar improve your English and IELTS writing",
        "type": "file",
        "url": "https://drive.google.com/file/d/14otTcl22PC-Asp3Gu3n4vKBZOQoJeRph/view"
      }
    ],
    "audios": [],
    "pdfs": []
  },
  {
    "id": "webinars-expert",
    "title": "Webinars & Expert Sessions",
    "description": "IDP expert webinars — IELTS Talks: Meet the Expert, aur ek Band 8 test-taker ke saath session, plus ek recorded session.",
    "tags": [
      "webinar",
      "idp",
      "expert"
    ],
    "videos": [
      {
        "title": "Free IDP Webinar #8  IELTS Talks - Meet the Expert",
        "type": "file",
        "url": "https://drive.google.com/file/d/1I_htqgOeJJJALi0eQUsH96YWqOSHL3sL/view"
      },
      {
        "title": "Free-IDP-Webinar-4-IELTS-Talks-Meet-a-Band-8-test-taker",
        "type": "file",
        "url": "https://drive.google.com/file/d/1QEiHWZmX-ftSd43yYAsELjjU0SSUvBUu/view"
      },
      {
        "title": "Recorded Session",
        "type": "file",
        "url": "https://drive.google.com/file/d/12E9xXQQFptO0nskla-0nGjGmWnEa7-BT/view"
      }
    ],
    "audios": [],
    "pdfs": []
  }
];


/* Pehle hafte (Week 1: 23-29 Nov 2026) ka diagnostic schedule —
   ye dates fix hain, baaki saal ka plan Planner khud banata hai. */
window.IELTS_SCHEDULE = {
  "2026-11-23": ["speaking"],
  "2026-11-24": ["listening-test-audio"],
  "2026-11-25": ["reading-practice"],
  "2026-11-26": ["writing-task1-charts"],
  "2026-11-27": ["writing-task2-essays"],
  "2026-11-28": ["speaking"],
  "2026-11-29": []
};

/* Planner ke liye pehle se bhare hue defaults (Settings me badal sakte ho) */
window.PLAN_DEFAULTS = {
  "startDate": "2026-11-23",
  "endDate": "2027-11-22",
  "chaptersPerDay": 1,
  "offDays": [0],
  "revisionEvery": 7
};
