/*
 * Minimal, robust ES-Module Mustache Template Engine
 * Conforms to the Mustache specification:
 * - {{var}} (HTML escaped interpolation)
 * - {{{var}}} and {{&var}} (unescaped interpolation)
 * - {{#var}}...{{/var}} (truthy section or array loop)
 * - {{^var}}...{{/var}} (inverted/falsy section)
 * - {{! comment }} (ignored)
 * - Dot notation: {{user.name}}
 * - Current context: {{.}}
 */

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(string) {
  if (string == null) return '';
  return String(string).replace(/[&<>"']/g, (s) => entityMap[s]);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class Context {
  constructor(view, parentContext) {
    this.view = view;
    this.parent = parentContext;
    this.cache = { '.': this.view };
  }

  push(view) {
    return new Context(view, this);
  }

  lookup(name) {
    const { cache } = this;
    if (cache && Object.prototype.hasOwnProperty.call(cache, name)) {
      return cache[name];
    }

    let context = this;
    let intermediateValue;
    let names;
    let index;
    let lookupHit = false;
    let value;

    while (context) {
      if (name.indexOf('.') > 0) {
        intermediateValue = context.view;
        names = name.split('.');
        index = 0;

        while (intermediateValue != null && index < names.length) {
          if (index === names.length - 1) {
            lookupHit = (
              typeof intermediateValue === 'object'
              && intermediateValue !== null
              && Object.prototype.hasOwnProperty.call(intermediateValue, names[index])
            );
          }
          intermediateValue = intermediateValue[names[index]];
          index += 1;
        }

        if (lookupHit) {
          value = intermediateValue;
          break;
        }
      } else if (
        context.view != null
        && typeof context.view === 'object'
        && Object.prototype.hasOwnProperty.call(context.view, name)
      ) {
        value = context.view[name];
        lookupHit = true;
        break;
      }

      context = context.parent;
    }

    if (lookupHit) {
      cache[name] = value;
    }

    if (typeof value === 'function') {
      value = value.call(this.view);
    }

    return value;
  }
}

function createScanner(string) {
  let tail = string;
  let pos = 0;

  return {
    eos() {
      return tail === '';
    },
    scan(re) {
      const match = tail.match(re);
      if (!match || match.index !== 0) return '';
      const matched = match[0];
      tail = tail.substring(matched.length);
      pos += matched.length;
      return matched;
    },
    scanUntil(re) {
      const index = tail.search(re);
      let match;
      switch (index) {
        case -1:
          match = tail;
          tail = '';
          pos += match.length;
          break;
        case 0:
          match = '';
          break;
        default:
          match = tail.substring(0, index);
          tail = tail.substring(index);
          pos += index;
      }
      return match;
    },
    getPos() {
      return pos;
    },
  };
}

function nestTokens(tokens) {
  const nestedTokens = [];
  const sections = [];
  let collector = nestedTokens;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    switch (token.type) {
      case '#':
      case '^':
        collector.push(token);
        sections.push(token);
        token.subTokens = [];
        collector = token.subTokens;
        break;
      case '/': {
        const section = sections.pop();
        if (!section || section.value !== token.value) {
          throw new Error(`Unclosed section: ${section ? section.value : 'unknown'}`);
        }
        if (sections.length > 0) {
          collector = sections[sections.length - 1].subTokens;
        } else {
          collector = nestedTokens;
        }
        break;
      }
      default:
        collector.push(token);
    }
  }

  if (sections.length > 0) {
    throw new Error(`Unclosed section: ${sections[sections.length - 1].value}`);
  }

  return nestedTokens;
}

export function parse(template) {
  const tokens = [];
  const scanner = createScanner(template);
  const openTag = '{{';
  const closeTag = '}}';

  while (!scanner.eos()) {
    const text = scanner.scanUntil(new RegExp(escapeRegExp(openTag)));
    if (text) {
      tokens.push({ type: 'text', value: text });
    }

    if (!scanner.scan(new RegExp(escapeRegExp(openTag)))) break;

    let type = scanner.scan(/^[#^/!&{>]/);
    let close = closeTag;
    if (type === '{') {
      close = `}${closeTag}`;
    }

    let value = scanner.scanUntil(new RegExp(escapeRegExp(close)));
    scanner.scan(new RegExp(escapeRegExp(close)));

    value = value.trim();

    if (type === '{') {
      type = '&';
    } else if (!type) {
      type = 'name';
    }

    if (type !== '!') {
      tokens.push({ type, value });
    }
  }

  return nestTokens(tokens);
}

function renderTokens(tokens, context, originalTemplate) {
  let buffer = '';

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const { type, value, subTokens } = token;

    switch (type) {
      case 'text':
        buffer += value;
        break;
      case 'name': {
        const val = context.lookup(value);
        if (val != null) buffer += escapeHtml(val);
        break;
      }
      case '&': {
        const val = context.lookup(value);
        if (val != null) buffer += String(val);
        break;
      }
      case '#': {
        const val = context.lookup(value);
        if (val) {
          if (Array.isArray(val)) {
            for (let j = 0; j < val.length; j += 1) {
              buffer += renderTokens(subTokens, context.push(val[j]), originalTemplate);
            }
          } else if (typeof val === 'object') {
            buffer += renderTokens(subTokens, context.push(val), originalTemplate);
          } else {
            buffer += renderTokens(subTokens, context, originalTemplate);
          }
        }
        break;
      }
      case '^': {
        const val = context.lookup(value);
        if (!val || (Array.isArray(val) && val.length === 0)) {
          buffer += renderTokens(subTokens, context, originalTemplate);
        }
        break;
      }
      default:
        break;
    }
  }

  return buffer;
}

export function render(template, view) {
  if (typeof template !== 'string') return '';
  const tokens = parse(template);
  const context = (view instanceof Context) ? view : new Context(view);
  return renderTokens(tokens, context, template);
}

const Mustache = {
  render,
  parse,
  escapeHtml,
  Context,
};

export default Mustache;
