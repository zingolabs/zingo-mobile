package com.zingo

// import android.content.Context
import androidx.test.filters.SmallTest
// import androidx.test.runner.AndroidJUnit4
import com.google.common.truth.Truth.assertThat
import org.junit.Test
// import org.junit.runner.RunWith

@SmallTest
class ExportTest {
    @Test
    fun callExport() {
        val export = 1
        
        assertThat(export).isEqualTo(2)
    }
}

