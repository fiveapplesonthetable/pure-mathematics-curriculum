// Zero-dependency build-time syntax highlighter for code listings.
// Emits semantic <span class="tok-*"> markup that adapts cleanly to light and dark themes.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (cls, text) => `<span class="tok-${cls}">${esc(text)}</span>`;

const KW = {
  rust: new Set([
    'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum',
    'extern', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move',
    'mut', 'pub', 'ref', 'return', 'self', 'static', 'struct', 'super', 'trait', 'type',
    'unsafe', 'use', 'where', 'while',
  ]),
  cpp: new Set([
    'alignas', 'alignof', 'auto', 'break', 'case', 'catch', 'class', 'co_await', 'co_return',
    'co_yield', 'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast',
    'continue', 'decltype', 'default', 'delete', 'do', 'dynamic_cast', 'else', 'enum',
    'explicit', 'export', 'extern', 'final', 'for', 'friend', 'goto', 'if', 'inline',
    'mutable', 'namespace', 'new', 'noexcept', 'operator', 'override', 'private', 'protected',
    'public', 'reinterpret_cast', 'requires', 'return', 'sizeof', 'static', 'static_assert',
    'static_cast', 'struct', 'switch', 'template', 'this', 'thread_local', 'throw', 'try',
    'typedef', 'typeid', 'typename', 'union', 'using', 'virtual', 'volatile', 'while',
  ]),
  c: new Set([
    'auto', 'break', 'case', 'const', 'continue', 'default', 'do', 'else', 'enum', 'extern',
    'for', 'goto', 'if', 'inline', 'register', 'restrict', 'return', 'sizeof', 'static',
    'struct', 'switch', 'typedef', 'union', 'volatile', 'while', '_Alignas', '_Alignof',
    '_Atomic', '_Static_assert',
  ]),
  java: new Set([
    'abstract', 'assert', 'break', 'case', 'catch', 'class', 'continue', 'default', 'do',
    'else', 'enum', 'extends', 'final', 'finally', 'for', 'if', 'implements', 'import',
    'instanceof', 'interface', 'native', 'new', 'package', 'private', 'protected', 'public',
    'record', 'return', 'sealed', 'static', 'strictfp', 'super', 'switch', 'synchronized',
    'this', 'throw', 'throws', 'transient', 'try', 'var', 'volatile', 'while', 'permits',
  ]),
  typescript: new Set([
    'abstract', 'as', 'asserts', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
    'continue', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export',
    'extends', 'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import',
    'in', 'infer', 'instanceof', 'interface', 'is', 'keyof', 'let', 'module', 'namespace',
    'new', 'of', 'override', 'package', 'private', 'protected', 'public', 'readonly',
    'return', 'satisfies', 'set', 'static', 'super', 'switch', 'this', 'throw', 'try',
    'type', 'typeof', 'unique', 'var', 'void', 'while', 'with', 'yield',
  ]),
  kotlin: new Set([
    'abstract', 'actual', 'annotation', 'as', 'break', 'by', 'catch', 'class', 'companion',
    'const', 'constructor', 'continue', 'crossinline', 'data', 'delegate', 'do', 'else',
    'enum', 'expect', 'external', 'final', 'finally', 'for', 'fun', 'get', 'if', 'import',
    'in', 'infix', 'init', 'inline', 'inner', 'interface', 'internal', 'is', 'it', 'lateinit',
    'noinline', 'object', 'open', 'operator', 'out', 'override', 'package', 'private',
    'protected', 'public', 'reified', 'return', 'sealed', 'set', 'super', 'suspend',
    'tailrec', 'this', 'throw', 'try', 'typealias', 'val', 'value', 'var', 'vararg', 'when',
    'where', 'while',
  ]),
  go: new Set([
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough',
    'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range',
    'return', 'select', 'struct', 'switch', 'type', 'var',
  ]),
  ocaml: new Set([
    'and', 'as', 'assert', 'begin', 'class', 'constraint', 'do', 'done', 'downto', 'else',
    'end', 'exception', 'external', 'for', 'fun', 'function', 'functor', 'if', 'in',
    'include', 'inherit', 'initializer', 'land', 'lazy', 'let', 'lor', 'lsl', 'lsr', 'lxor',
    'match', 'method', 'mod', 'module', 'mutable', 'new', 'nonrec', 'object', 'of', 'open',
    'or', 'private', 'rec', 'sig', 'struct', 'then', 'to', 'try', 'type', 'val', 'virtual',
    'when', 'while', 'with',
  ]),
  haskell: new Set([
    'case', 'class', 'data', 'default', 'deriving', 'do', 'else', 'forall', 'foreign', 'if',
    'import', 'in', 'infix', 'infixl', 'infixr', 'instance', 'let', 'module', 'newtype',
    'of', 'qualified', 'then', 'type', 'where',
  ]),
  python: new Set([
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
    'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
    'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while',
    'with', 'yield', 'match', 'case',
  ]),
  shell: new Set([
    'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'case', 'esac', 'while',
    'until', 'function', 'return', 'exit', 'export', 'local', 'readonly', 'set', 'unset',
  ]),
};
KW.javascript = KW.typescript;

const SQL_KW = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
  'LATERAL', 'ON', 'USING', 'GROUP', 'BY', 'HAVING', 'WINDOW', 'OVER', 'PARTITION', 'ROWS',
  'RANGE', 'GROUPS', 'BETWEEN', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW',
  'ORDER', 'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST', 'LIMIT', 'OFFSET', 'FETCH', 'NEXT',
  'ONLY', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'RETURNING', 'MERGE',
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'TEMP', 'TEMPORARY', 'UNLOGGED', 'INDEX', 'UNIQUE',
  'CONCURRENTLY', 'VIEW', 'MATERIALIZED', 'SCHEMA', 'SEQUENCE', 'EXTENSION', 'TYPE', 'ENUM',
  'DOMAIN', 'FUNCTION', 'PROCEDURE', 'RETURNS', 'LANGUAGE', 'PLPGSQL', 'SQL', 'DECLARE',
  'BEGIN', 'END', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'START', 'TRANSACTION', 'ISOLATION',
  'LEVEL', 'READ', 'UNCOMMITTED', 'COMMITTED', 'REPEATABLE', 'SERIALIZABLE', 'DEFERRABLE',
  'INITIALLY', 'DEFERRED', 'IMMEDIATE', 'CONSTRAINT', 'PRIMARY', 'FOREIGN', 'KEY',
  'REFERENCES', 'CHECK', 'UNIQUE', 'EXCLUDE', 'GIST', 'GIN', 'BRIN', 'BTREE', 'HASH',
  'INCLUDE', 'WITH', 'WITHOUT', 'TIME', 'ZONE', 'DEFAULT', 'GENERATED', 'ALWAYS', 'AS',
  'IDENTITY', 'STORED', 'NOT', 'AND', 'OR', 'IN', 'EXISTS', 'ANY', 'ALL', 'SOME', 'IS',
  'DISTINCT', 'LIKE', 'ILIKE', 'SIMILAR', 'TO', 'CASE', 'WHEN', 'THEN', 'ELSE', 'CAST',
  'COALESCE', 'NULLIF', 'GREATEST', 'LEAST', 'UNION', 'INTERSECT', 'EXCEPT', 'RECURSIVE',
  'EXPLAIN', 'ANALYZE', 'BUFFERS', 'COSTS', 'TIMING', 'FORMAT', 'VACUUM', 'FREEZE',
  'CHECKPOINT', 'LOCK', 'FOR', 'SHARE', 'NO', 'KEY', 'SKIP', 'LOCKED', 'NOWAIT', 'TRIGGER',
  'AFTER', 'BEFORE', 'EACH', 'EXECUTE', 'RAISE', 'EXCEPTION', 'IF', 'ELSIF', 'LOOP',
  'PERFORM', 'CONFLICT', 'DO', 'NOTHING', 'ATTACH', 'DETACH', 'MODULUS', 'REMAINDER',
  'PUBLICATION', 'SUBSCRIPTION',
]);

const SQL_TY = new Set([
  'SMALLINT', 'INTEGER', 'INT', 'INT2', 'INT4', 'INT8', 'BIGINT', 'SERIAL', 'BIGSERIAL',
  'DECIMAL', 'NUMERIC', 'REAL', 'DOUBLE', 'PRECISION', 'FLOAT', 'FLOAT4', 'FLOAT8',
  'MONEY', 'CHAR', 'CHARACTER', 'VARCHAR', 'VARYING', 'TEXT', 'BYTEA', 'TIMESTAMP',
  'TIMESTAMPTZ', 'DATE', 'INTERVAL', 'BOOLEAN', 'BOOL', 'UUID', 'JSON', 'JSONB', 'INET',
  'CIDR', 'INT4RANGE', 'INT8RANGE', 'NUMRANGE', 'TSTZRANGE', 'DATERANGE', 'OID', 'XID',
  'XID8', 'PG_LSN', 'RECORD', 'VOID',
]);

const TYPES = {
  rust: new Set([
    'Self', 'bool', 'char', 'f32', 'f64', 'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
    'str', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'Box', 'Vec', 'String', 'Option',
    'Result', 'Rc', 'Arc', 'Weak', 'Cell', 'RefCell', 'UnsafeCell', 'Mutex', 'RwLock',
    'Pin', 'Unpin', 'Future', 'Poll', 'Context', 'Waker', 'Cow', 'PhantomData', 'Send',
    'Sync', 'Copy', 'Clone', 'Drop', 'Default', 'Debug', 'Display', 'Iterator', 'IntoIterator',
    'From', 'Into', 'TryFrom', 'TryInto', 'AsRef', 'Deref', 'DerefMut', 'Fn', 'FnMut', 'FnOnce',
  ]),
  cpp: new Set([
    'bool', 'char', 'char8_t', 'char16_t', 'char32_t', 'wchar_t', 'short', 'int', 'long',
    'signed', 'unsigned', 'float', 'double', 'void', 'size_t', 'ssize_t', 'ptrdiff_t',
    'intptr_t', 'uintptr_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t',
    'uint16_t', 'uint32_t', 'uint64_t', 'string', 'string_view', 'vector', 'span', 'array',
    'unique_ptr', 'shared_ptr', 'weak_ptr', 'optional', 'variant', 'mutex', 'lock_guard',
    'unique_lock', 'atomic',
  ]),
  c: new Set([
    'bool', 'char', 'short', 'int', 'long', 'signed', 'unsigned', 'float', 'double', 'void',
    'size_t', 'ssize_t', 'ptrdiff_t', 'intptr_t', 'uintptr_t', 'int8_t', 'int16_t',
    'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'FILE', 'PGconn',
    'pthread_t', 'pthread_mutex_t',
  ]),
  java: new Set([
    'boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double', 'void',
    'Object', 'String', 'Long', 'Integer', 'Double', 'Boolean', 'BigDecimal', 'BigInteger',
    'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'Optional', 'Thread', 'Runnable',
    'Callable', 'Future', 'Exception', 'RuntimeException', 'SQLException', 'Connection',
  ]),
  typescript: new Set([
    'any', 'bigint', 'boolean', 'never', 'number', 'object', 'string', 'symbol', 'unknown',
    'void', 'Array', 'ReadonlyArray', 'Map', 'Set', 'Promise', 'Record', 'Partial',
    'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable',
    'ReturnType', 'Parameters', 'Date', 'Error',
  ]),
  kotlin: new Set([
    'Any', 'Boolean', 'Byte', 'Char', 'Double', 'Float', 'Int', 'Long', 'Nothing', 'Short',
    'String', 'UByte', 'UInt', 'ULong', 'UShort', 'Unit', 'List', 'MutableList', 'Map',
    'MutableMap', 'Set', 'Sequence', 'Flow', 'StateFlow', 'SharedFlow', 'Channel',
    'CoroutineScope', 'Continuation', 'Job', 'Deferred', 'Result',
  ]),
  go: new Set([
    'any', 'bool', 'byte', 'comparable', 'complex64', 'complex128', 'error', 'float32',
    'float64', 'int', 'int8', 'int16', 'int32', 'int64', 'rune', 'string', 'uint', 'uint8',
    'uint16', 'uint32', 'uint64', 'uintptr', 'Context', 'Mutex', 'WaitGroup',
  ]),
  ocaml: new Set([
    'int', 'float', 'bool', 'char', 'string', 'bytes', 'unit', 'list', 'array', 'option',
    'result', 'ref', 'exn',
  ]),
  haskell: new Set([
    'Int', 'Integer', 'Float', 'Double', 'Bool', 'Char', 'String', 'Maybe', 'Either', 'IO',
    'Ordering', 'Functor', 'Applicative', 'Monad', 'Monoid', 'Semigroup', 'Eq', 'Ord', 'Show',
  ]),
  python: new Set([
    'int', 'float', 'bool', 'str', 'bytes', 'list', 'dict', 'set', 'tuple', 'object',
    'Exception', 'Optional', 'Any', 'Callable', 'Decimal',
  ]),
  shell: new Set([]),
};
TYPES.javascript = TYPES.typescript;

const LITS = new Set([
  'true', 'false', 'null', 'nil', 'nullptr', 'undefined', 'None', 'Some', 'Ok', 'Err',
  'True', 'False', 'Just', 'Nothing', 'Left', 'Right', 'iota',
]);
const SQL_LITS = new Set(['NULL', 'TRUE', 'FALSE', 'UNKNOWN', 'DEFAULT']);

export function normalizeLangKey(raw) {
  if (!raw) return '';
  const k = raw.trim().replace(/^\[[^\]]*\]/, '').toLowerCase();
  const map = {
    rust: 'rust', 'c++': 'cpp', cpp: 'cpp', cxx: 'cpp', c: 'c', java: 'java',
    typescript: 'typescript', ts: 'typescript', javascript: 'javascript', js: 'javascript',
    kotlin: 'kotlin', kt: 'kotlin', go: 'go', golang: 'go', ocaml: 'ocaml', ml: 'ocaml',
    haskell: 'haskell', hs: 'haskell', sql: 'sql', pgsql: 'sql', postgres: 'sql',
    postgresql: 'sql', python: 'python', py: 'python', toml: 'toml', json: 'json',
    bash: 'shell', sh: 'shell', shell: 'shell', plain: 'plain', text: 'plain',
  };
  return map[k] || 'plain';
}

export function inferLangKey(code) {
  const s = code.trim();
  if (/^(SELECT|INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|TYPE|OR\s+REPLACE)|BEGIN;|WITH\s+RECURSIVE|ALTER\s+TABLE|EXPLAIN\b|--\s)/im.test(s)) {
    if (/^(Seq Scan|Index (Only )?Scan|Bitmap |Hash Join|Nested Loop|Merge Join|Sort |Aggregate )/m.test(s) && !/^(EXPLAIN|SELECT)/im.test(s)) {
      return 'plain';
    }
    return 'sql';
  }
  return 'plain';
}

function highlightDiagnosticOrPlan(code) {
  // Subtle highlighting for compiler errors, Postgres logs, HTTP headers, and EXPLAIN plans
  return code
    .split('\n')
    .map((line) => {
      let m;
      if ((m = /^(error(?:\[[A-Z0-9]+\])?:|PANIC:|ERROR:|FATAL:|WARNING:)(\s.*)?$/.exec(line))) {
        return wrap('num', m[1]) + esc(m[2] || '');
      }
      if ((m = /^(note:|help:|LOG:|DETAIL:|HINT:)(\s.*)?$/.exec(line))) {
        return wrap('kw', m[1]) + esc(m[2] || '');
      }
      if ((m = /^(POST|GET|PUT|DELETE|PATCH|HTTP\/1\.1)\b(.*)$/.exec(line))) {
        return wrap('kw', m[1]) + esc(m[2]);
      }
      if ((m = /^([A-Za-z0-9-]+:)(\s+.+)$/.exec(line)) && !line.includes('  ')) {
        return wrap('ty', m[1]) + esc(m[2]);
      }
      if ((m = /^(\s*(?:->\s*)?)(Seq Scan|Index Only Scan|Index Scan|Bitmap Heap Scan|Bitmap Index Scan|Hash Join|Merge Join|Nested Loop|HashAggregate|GroupAggregate|Sort|Limit|Hash|Gather\b[\w ]*)(\b.*)$/.exec(line))) {
        return esc(m[1]) + wrap('kw', m[2]) + esc(m[3]).replace(/\(cost=[^)]+\)|\(actual time=[^)]+\)/g, ( x ) => `<span class="tok-cmt">${x}</span>`);
      }
      return esc(line);
    })
    .join('\n');
}

export function highlightCode(code, rawLang) {
  let lang = normalizeLangKey(rawLang);
  if (!lang || lang === 'plain') lang = inferLangKey(code);
  if (lang === 'plain') return highlightDiagnosticOrPlan(code);

  if (lang === 'json' || lang === 'toml') {
    return tokenizeConfig(code, lang);
  }

  const kwSet = lang === 'sql' ? SQL_KW : (KW[lang] || new Set());
  const tySet = lang === 'sql' ? SQL_TY : (TYPES[lang] || new Set());
  const out = [];
  let i = 0;
  let prevKw = '';
  const n = code.length;

  while (i < n) {
    const c = code[i];
    const next = code[i + 1] || '';

    // 1. Line & block comments by language
    if ((c === '/' && next === '/') && lang !== 'sql' && lang !== 'ocaml' && lang !== 'haskell' && lang !== 'python' && lang !== 'shell') {
      let end = code.indexOf('\n', i);
      if (end < 0) end = n;
      out.push(wrap('cmt', code.slice(i, end)));
      i = end;
      continue;
    }
    if (c === '/' && next === '*' && lang !== 'ocaml' && lang !== 'haskell' && lang !== 'python' && lang !== 'shell') {
      let end = code.indexOf('*/', i + 2);
      end = end < 0 ? n : end + 2;
      out.push(wrap('cmt', code.slice(i, end)));
      i = end;
      continue;
    }
    if (c === '-' && next === '-' && (lang === 'sql' || lang === 'haskell')) {
      let end = code.indexOf('\n', i);
      if (end < 0) end = n;
      out.push(wrap('cmt', code.slice(i, end)));
      i = end;
      continue;
    }
    if (c === '(' && next === '*' && lang === 'ocaml') {
      let depth = 1, j = i + 2;
      while (j < n && depth > 0) {
        if (code[j] === '(' && code[j + 1] === '*') { depth++; j += 2; }
        else if (code[j] === '*' && code[j + 1] === ')') { depth--; j += 2; }
        else j++;
      }
      out.push(wrap('cmt', code.slice(i, j)));
      i = j;
      continue;
    }
    if (c === '{' && next === '-' && lang === 'haskell') {
      let end = code.indexOf('-}', i + 2);
      end = end < 0 ? n : end + 2;
      out.push(wrap('cmt', code.slice(i, end)));
      i = end;
      continue;
    }
    if (c === '#' && (lang === 'python' || lang === 'shell')) {
      let end = code.indexOf('\n', i);
      if (end < 0) end = n;
      out.push(wrap('cmt', code.slice(i, end)));
      i = end;
      continue;
    }

    // 2. Attributes, annotations, preprocessor directives
    if (lang === 'rust' && c === '#' && (next === '[' || (next === '!' && code[i + 2] === '['))) {
      let depth = 0, j = i;
      while (j < n) {
        if (code[j] === '[') depth++;
        else if (code[j] === ']') { depth--; if (depth === 0) { j++; break; } }
        j++;
      }
      out.push(wrap('mac', code.slice(i, j)));
      i = j;
      continue;
    }
    if ((lang === 'c' || lang === 'cpp') && c === '#' && (i === 0 || code[i - 1] === '\n')) {
      let end = code.indexOf('\n', i);
      if (end < 0) end = n;
      out.push(wrap('mac', code.slice(i, end)));
      i = end;
      continue;
    }
    if ((lang === 'java' || lang === 'kotlin' || lang === 'typescript' || lang === 'python') && c === '@' && /[A-Za-z_]/.test(next)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.]/.test(code[j])) j++;
      out.push(wrap('mac', code.slice(i, j)));
      i = j;
      continue;
    }

    // 3. Rust raw strings r#"..."# or r"..."
    if (lang === 'rust' && (c === 'r' || c === 'b') && (next === '#' || next === '"')) {
      const m = /^b?r(#*)"/.exec(code.slice(i));
      if (m) {
        const hashes = m[1];
        const closePat = '"' + hashes;
        let end = code.indexOf(closePat, i + m[0].length);
        end = end < 0 ? n : end + closePat.length;
        out.push(wrap('str', code.slice(i, end)));
        i = end;
        continue;
      }
    }

    // 4. Rust lifetimes ('a, 'static, '_) vs char literals ('x', '\n')
    if ((lang === 'rust' || lang === 'ocaml') && c === '\'') {
      const lifeM = /^'(?:_|[a-zA-Z][a-zA-Z0-9_]*)/.exec(code.slice(i));
      if (lifeM && code[i + lifeM[0].length] !== '\'') {
        out.push(wrap('mac', lifeM[0]));
        i += lifeM[0].length;
        continue;
      }
      // Char literal
      let j = i + 1;
      if (code[j] === '\\') j += 2;
      else j += 1;
      if (code[j] === '\'') {
        out.push(wrap('str', code.slice(i, j + 1)));
        i = j + 1;
        continue;
      }
    }

    // 5. Strings ("...", '...', `...`)
    if (c === '"' || (c === '`' && (lang === 'typescript' || lang === 'javascript' || lang === 'go' || lang === 'sql')) || (c === '\'' && lang !== 'rust' && lang !== 'ocaml' && lang !== 'haskell')) {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\' && lang !== 'sql') { j += 2; continue; }
        if (lang === 'sql' && code[j] === '\'' && code[j + 1] === '\'') { j += 2; continue; }
        if (code[j] === quote) { j++; break; }
        if (code[j] === '\n' && quote !== '`' && lang !== 'sql') break;
        j++;
      }
      out.push(wrap('str', code.slice(i, j)));
      i = j;
      continue;
    }
    if (c === '\'' && lang === 'haskell') {
      const chM = /^'(?:\\.|[^'\\])'/.exec(code.slice(i));
      if (chM) {
        out.push(wrap('str', chM[0]));
        i += chM[0].length;
        continue;
      }
    }

    // 6. SQL positional parameters ($1, $2)
    if (lang === 'sql' && c === '$' && /[0-9]/.test(next)) {
      let j = i + 1;
      while (j < n && /[0-9]/.test(code[j])) j++;
      out.push(wrap('mac', code.slice(i, j)));
      i = j;
      continue;
    }

    // 7. Numbers
    if (/[0-9]/.test(c) && (i === 0 || !/[A-Za-z_$]/.test(code[i - 1]))) {
      const numM = /^(?:0[xXbBoO][0-9a-fA-F_]+|[0-9][0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9_]+)?)(?:[a-zA-Z0-9_]*)/.exec(code.slice(i));
      if (numM) {
        out.push(wrap('num', numM[0]));
        i += numM[0].length;
        continue;
      }
    }

    // 8. Identifiers, keywords, types, macros, function names
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);

      // Rust macro invocation foo!
      if (lang === 'rust' && code[j] === '!' && code[j + 1] !== '=') {
        out.push(wrap('mac', word + '!'));
        i = j + 1;
        continue;
      }

      if (lang === 'sql') {
        const up = word.toUpperCase();
        if (SQL_LITS.has(up)) out.push(wrap('num', word));
        else if (tySet.has(up)) out.push(wrap('ty', word));
        else if (kwSet.has(up)) out.push(wrap('kw', word));
        else if (code[j] === '(') out.push(wrap('fn', word));
        else out.push(esc(word));
        i = j;
        continue;
      }

      if (LITS.has(word)) {
        out.push(wrap('num', word));
        prevKw = '';
      } else if (kwSet.has(word)) {
        out.push(wrap('kw', word));
        prevKw = word;
      } else if (tySet.has(word) || (/^[A-Z][A-Za-z0-9_]*$/.test(word) && !/^[A-Z0-9_]+$/.test(word))) {
        out.push(wrap('ty', word));
        prevKw = '';
      } else {
        // Check if followed by (, ::<, or preceded by fn/function/fun/func/def
        let k = j;
        while (k < n && code[k] === ' ') k++;
        const isFnDef = prevKw === 'fn' || prevKw === 'function' || prevKw === 'fun' || prevKw === 'func' || prevKw === 'def';
        if (code[k] === '(' || isFnDef || code.slice(k, k + 3) === '::<') out.push(wrap('fn', word));
        else out.push(esc(word));
        prevKw = '';
      }
      i = j;
      continue;
    }

    out.push(esc(c));
    i++;
  }
  return out.join('');
}

function tokenizeConfig(code, lang) {
  const out = [];
  let i = 0;
  let prevKw = '';
  const n = code.length;
  while (i < n) {
    const c = code[i];
    if (lang === 'toml' && c === '#') {
      let end = code.indexOf('\n', i);
      if (end < 0) end = n;
      out.push(wrap('cmt', code.slice(i, end)));
      i = end;
      continue;
    }
    if (c === '"' || (lang === 'toml' && c === '\'')) {
      const q = c;
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\' && q === '"') { j += 2; continue; }
        if (code[j] === q) { j++; break; }
        j++;
      }
      const tok = code.slice(i, j);
      let k = j;
      while (k < n && (code[k] === ' ' || code[k] === '\t')) k++;
      if (lang === 'json' && code[k] === ':') out.push(wrap('ty', tok));
      else out.push(wrap('str', tok));
      i = j;
      continue;
    }
    if (lang === 'toml' && c === '[' && (i === 0 || code[i - 1] === '\n')) {
      let end = code.indexOf('\n', i);
      if (end < 0) end = n;
      out.push(wrap('kw', code.slice(i, end)));
      i = end;
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9][0-9._eE+-]*/.exec(code.slice(i));
      if (m) { out.push(wrap('num', m[0])); i += m[0].length; continue; }
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_-]/.test(code[j])) j++;
      const w = code.slice(i, j);
      if (w === 'true' || w === 'false' || w === 'null') out.push(wrap('num', w));
      else out.push(wrap('ty', w));
      i = j;
      continue;
    }
    out.push(esc(c));
    i++;
  }
  return out.join('');
}
