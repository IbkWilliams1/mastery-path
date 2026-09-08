/* Shared, side-effect-free import checks. Also exercised by Node tests. */
(function (root) {
  const fields = [
    "subject",
    "topic",
    "skill",
    "difficulty",
    "question",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "answer",
    "explanation",
  ];
  const canonical = (s) =>
    String(s ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/[,!?;:"']/g, "")
      .replace(/(?<!\d)\.|\.(?!\d)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  function csv(text) {
    const rows = [];
    let row = [],
      cell = "",
      quoted = false,
      closed = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            quoted = false;
            closed = true;
          }
        } else cell += c;
        continue;
      }
      if (c === '"') {
        if (cell.trim() || closed)
          throw Error("Unexpected quotation mark. Quote the entire CSV cell.");
        cell = "";
        quoted = true;
      } else if (c === "," || c === "\n" || c === "\r") {
        row.push(cell.trim());
        cell = "";
        closed = false;
        if (c !== ",") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          if (row.some(Boolean)) rows.push(row);
          row = [];
        }
      } else {
        if (closed && !/\s/.test(c)) throw Error("Unexpected text after a closing quote.");
        cell += c;
      }
    }
    if (quoted) throw Error("Unclosed quotation mark in CSV.");
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }
  function normalise(o) {
    if (!o || typeof o !== "object" || Array.isArray(o))
      throw Error("Each JSON question must be an object.");
    const r = {};
    for (const field of fields) {
      const alias =
        field === "question" ? "question_text" : field === "answer" ? "correct_answer" : field;
      const value = o[field] ?? o[alias] ?? "";
      if (!["string", "number"].includes(typeof value))
        throw Error("Question fields must contain text or numbers.");
      r[field === "question" ? "question_text" : field === "answer" ? "correct_answer" : field] =
        String(value).trim();
    }
    r.difficulty = Number(r.difficulty);
    r.correct_answer = r.correct_answer.toUpperCase();
    return r;
  }
  function parse(text) {
    try {
      text = text.replace(/^\uFEFF/, "").trim();
      if (!text) throw Error("Paste questions first.");
      let records;
      if (/^[\[{]/.test(text)) {
        const d = JSON.parse(text);
        records = (Array.isArray(d) ? d : [d]).map(normalise);
      } else {
        const data = csv(text);
        const header = data.shift().map((h) =>
          h
            .toLowerCase()
            .replace(/^question_text$/, "question")
            .replace(/^correct_answer$/, "answer"),
        );
        if (
          header.length !== 11 ||
          new Set(header).size !== 11 ||
          fields.some((f) => !header.includes(f))
        )
          throw Error(
            "CSV needs the 11 named columns shown above, with no missing or repeated columns.",
          );
        records = data.map((cells, i) => {
          if (cells.length !== 11)
            throw Error(
              `CSV record ${i + 1} has ${cells.length} columns; expected 11. Quote cells containing commas.`,
            );
          return normalise(Object.fromEntries(header.map((h, j) => [h, cells[j]])));
        });
      }
      if (!records.length) throw Error("No question rows found.");
      return { rows: records };
    } catch (e) {
      return { rows: [], parseError: e.message };
    }
  }
  function optionKey(s) {
    const t = String(s).trim().replace(/\s+/g, "");
    const n = t.match(/^([+-]?\d+)(?:\.(\d+))?$/);
    const f = t.match(/^([+-]?\d+)\/([+-]?\d+)$/);
    if (n || f) {
      let a, b;
      if (n) {
        b = 10n ** BigInt((n[2] || "").length);
        a = BigInt(n[1]) * b + BigInt(n[2] || 0) * (n[1].startsWith("-") ? -1n : 1n);
      } else {
        a = BigInt(f[1]);
        b = BigInt(f[2]);
      }
      if (b !== 0n) {
        if (b < 0n) {
          a = -a;
          b = -b;
        }
        let x = a < 0n ? -a : a,
          y = b;
        while (y) {
          [x, y] = [y, x % y];
        }
        return `${a / x}/${b / x}`;
      }
    }
    return canonical(s);
  }
  function mathKey(s) {
    const m = String(s)
      .toLowerCase()
      .match(/\b(\d+)\s*(times|×|\*|\+)\s*(\d+)\b/);
    return m
      ? [m[2] === "+" ? "+" : "*", ...[Number(m[1]), Number(m[3])].sort((a, b) => a - b)].join(":")
      : null;
  }
  function similar(a, b) {
    const x = new Set(canonical(a).split(" ")),
      y = new Set(canonical(b).split(" "));
    if (x.size < 5 || y.size < 5) return false;
    const overlap = [...x].filter((t) => y.has(t)).length;
    return overlap / new Set([...x, ...y]).size >= 0.75;
  }
  function validate(rows, existing) {
    const prior = existing.map((q, i) => ({ q, where: `existing question ${i + 1}` }));
    return rows.map((q, i) => {
      const errors = [],
        warnings = [];
      for (const f of [
        "subject",
        "topic",
        "skill",
        "question_text",
        "explanation",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
      ])
        if (!String(q[f] ?? "").trim())
          errors.push(`Missing ${f.replace("_text", "").replace("_", " ")}.`);
      if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5)
        errors.push("Difficulty must be a whole number from 1 to 5.");
      if (!/^[ABCD]$/.test(q.correct_answer)) errors.push("Answer must be A, B, C or D.");
      const options = ["a", "b", "c", "d"].map((k) => q["option_" + k]);
      if (new Set(options.map(optionKey)).size !== 4)
        errors.push("Answer options must be distinct, including equivalent numbers or fractions.");
      for (const value of [q.question_text, ...options, q.explanation])
        for (const token of String(value).match(/\[TALLY[^\]]*\]/gi) || [])
          if (!/^\[TALLY:(?:[1-9]\d?|100)\]$/i.test(token))
            errors.push(`Unsupported tally token ${token}. Use [TALLY:1] through [TALLY:100].`);
      const matches = [];
      for (const p of prior) {
        if (canonical(p.q.subject) !== canonical(q.subject)) continue;
        if (canonical(p.q.question_text) === canonical(q.question_text))
          errors.push(`Duplicate of ${p.where}, even if its topic, skill or options differ.`);
        else if (
          similar(p.q.question_text, q.question_text) ||
          (mathKey(q.question_text) && mathKey(q.question_text) === mathKey(p.q.question_text))
        )
          matches.push({ where: p.where, question: p.q.question_text });
      }
      if (matches.length)
        warnings.push(
          "Possible duplicate or repeated calculation. Compare the questions before approving.",
        );
      prior.push({ q, where: `import row ${i + 1}` });
      return {
        row: i + 1,
        q,
        errors: [...new Set(errors)],
        warnings,
        matches: matches.slice(0, 5),
      };
    });
  }
  function coverage(rows) {
    const counts = new Map();
    for (const q of rows) {
      const key = JSON.stringify([q.subject, q.topic, q.skill, q.difficulty]);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts].map(([key, count]) => ({ group: JSON.parse(key), count }));
  }
  root.QuestionValidation = { parse, validate, coverage };
})(globalThis);
