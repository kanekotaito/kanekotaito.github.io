/* Additional question bank, v17.
 * Append new packs here without changing existing 1-600 questions or saved answers.
 * Every question must have a unique consecutive numeric ID starting at 601.
 * Example shape (do not add unverified legal questions):
 * {id:601,q:"...",a:"○",why:"...",topic:"法令",section:"S1",kind:"法令",pack:9}
 * A new paid pack should contain 50 questions and pack values 9,10,11...
 * This array may grow, and more <script> question modules may call push.apply()
 * on window.RYOJU_ADDITIONAL_QUESTIONS before index.html initializes the app.
 */
window.RYOJU_ADDITIONAL_QUESTIONS=window.RYOJU_ADDITIONAL_QUESTIONS||[];
