import Link from 'next/link';
import {
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"`]+)/g;
const TRAILING_PUNCTUATION_REGEX = /[),.;!?]+$/;

function splitUrlToken(token: string): { url: string; trailing: string } {
  const trailingMatch = token.match(TRAILING_PUNCTUATION_REGEX);
  if (!trailingMatch) {
    return { url: token, trailing: '' };
  }

  const trailing = trailingMatch[0];
  return {
    url: token.slice(0, -trailing.length),
    trailing,
  };
}

export function linkifyText(
  text: string,
  linkClassName = 'underline underline-offset-2 break-all'
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null = URL_REGEX.exec(text);

  while (match) {
    const matchedUrl = match[0];
    const matchIndex = match.index;

    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex));
    }

    const { url, trailing } = splitUrlToken(matchedUrl);
    if (url) {
      nodes.push(
        <Link
          key={`${url}-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {url}
        </Link>
      );
    }

    if (trailing) {
      nodes.push(trailing);
    }

    cursor = matchIndex + matchedUrl.length;
    match = URL_REGEX.exec(text);
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function linkifyNode(
  node: ReactNode,
  linkClassName = 'underline underline-offset-2 break-all'
): ReactNode {
  if (typeof node === 'string') {
    return linkifyText(node, linkClassName);
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={index}>{linkifyNode(child, linkClassName)}</Fragment>
    ));
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    if (element.props.children === undefined) {
      return element;
    }

    return cloneElement(
      element,
      {},
      linkifyNode(element.props.children, linkClassName)
    );
  }

  return node;
}

