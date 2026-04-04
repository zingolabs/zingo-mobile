import { useTheme } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeType } from '../../app/types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type HeaderTitleProps = {
  title: string;
  goBack: () => void;
  bottomSheet?: boolean;
};

const HeaderTitle: React.FC<HeaderTitleProps> = ({
  title,
  goBack,
  bottomSheet,
}) => {
  const { colors } = useTheme() as ThemeType;

  return (
    <SafeAreaView>
      <View style={styles.header}>
        <View style={styles.side}>
          <TouchableOpacity
            onPress={goBack}
            style={[styles.backButton, { borderColor: colors.text }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesomeIcon
              icon={bottomSheet ? faXmark : faChevronLeft}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <View pointerEvents="none" style={styles.titleContainer}>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: colors.text }]}
          >
            {title}
          </Text>
        </View>

        <View style={styles.side} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  side: {
    width: 58,
    justifyContent: 'center',
  },
  titleContainer: {
    position: 'absolute',
    left: 74,
    right: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 0.2,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 22,
    fontStyle: 'normal',
    fontWeight: '400',
  },
});

export default HeaderTitle;
