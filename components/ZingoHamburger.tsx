import { useContext } from "react"
import { TouchableOpacity, View } from "react-native"
import { useTheme } from '@react-navigation/native'
import { faBars } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome"

import { ContextAppLoaded } from '../app/context'
import { ThemeType } from "../app/types/ThemeType"

type HamburgerProps = {
    toggleMenuDrawer: () => void;
}


const ZingoHamburger: React.FunctionComponent<HamburgerProps> = (props) => {
    const { colors } = useTheme() as unknown as ThemeType;
    const ctx = useContext(ContextAppLoaded);

    return (
        <View style={{
            backgroundColor: colors.card,
            padding: 10,
            position: 'absolute',
            zIndex: 100,
        }}>
            <TouchableOpacity
                accessible={true}
                accessibilityLabel={ctx.translate('menudrawer-acc')}
                onPress={props.toggleMenuDrawer}>
                <FontAwesomeIcon icon={faBars} size={36} color={colors.border} />
            </TouchableOpacity>
        </View>
    )
}

export default ZingoHamburger
