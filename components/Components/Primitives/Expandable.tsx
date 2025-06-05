import React, { useState } from 'react';
import { Pressable } from 'react-native';

interface ExpandableProps {
  full: React.ReactNode;
  short: React.ReactNode;
  onExpand?: () => void;
}

export function Expandable({ full, short, onExpand }: ExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => {
    setExpanded(prev => !prev);
    if (onExpand) onExpand();
  };

  return <Pressable onPress={toggle}>{expanded ? full : short}</Pressable>;
}
