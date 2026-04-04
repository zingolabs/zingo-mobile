/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View } from 'react-native';

//import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import ClockActiveWithCheck from '../../../assets/icons/clock-active-with-check.svg';
import TriangleYellow from '../../../assets/icons/triangle-yellow.svg';
import LinearGradient from 'react-native-linear-gradient';

type StakingDayStatusBarProps = {};
const StakingDayStatusBar: React.FunctionComponent<
  StakingDayStatusBarProps
> = ({}) => {
  const context = useContext(ContextAppLoaded);
  const { stakingDay, timeToStakingDay, timeLeftStakingDay } = context;
  //const { colors } = useTheme() as ThemeType;

  const [expanded, setExpanded] = useState<boolean>(false);

  return (
    <LinearGradient
      colors={[
        stakingDay ? '#002309' : '#553000',
        stakingDay ? '#272727' : '#272727',
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingHorizontal: 15,
        paddingVertical: 7,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 100,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 100,
        height: 50,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {stakingDay ? (
          <ClockActiveWithCheck
            width={30}
            height={30}
            onPress={() => setExpanded(!expanded)}
          />
        ) : (
          <TriangleYellow
            width={30}
            height={30}
            onPress={() => setExpanded(!expanded)}
          />
        )}
        {expanded && (
          <View>
            {stakingDay ? (
              <>
                <RegText
                  style={{
                    fontSize: timeLeftStakingDay === '0min 0sec' ? 10 : 15,
                  }}
                >
                  {timeLeftStakingDay === '0min 0sec'
                    ? 'calculating...'
                    : timeLeftStakingDay}
                </RegText>
                <RegText style={{ fontSize: 12 }}>Staking day active</RegText>
              </>
            ) : (
              <>
                <RegText
                  style={{
                    fontSize: timeToStakingDay === '0min 0sec' ? 10 : 15,
                  }}
                >
                  {timeToStakingDay === '0min 0sec'
                    ? 'calculating...'
                    : timeToStakingDay}
                </RegText>
                <RegText style={{ fontSize: 12 }}>Staking day inactive</RegText>
              </>
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

export default React.memo(StakingDayStatusBar);
