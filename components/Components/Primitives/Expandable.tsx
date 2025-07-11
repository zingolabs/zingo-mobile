import React, { useState } from 'react';
import { Pressable } from 'react-native';

type ExpandableProps = {
  full: React.ReactNode;
  short: React.ReactNode;
  onExpand?: () => void;
}

const Expandable: React.FunctionComponent<ExpandableProps> = ({
  full,
  short,
  onExpand,
}) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => {
    setExpanded(prev => !prev);
    if (onExpand) {onExpand();}
  };

  return <Pressable onPress={toggle}>{expanded ? full : short}</Pressable>;
};

export default Expandable;
