package org.lampa.justplusprobe;
import android.content.*;import android.database.Cursor;import android.net.Uri;import android.os.ParcelFileDescriptor;import java.io.*;
public class ProbeMediaProvider extends ContentProvider {
 public boolean onCreate(){return true;} public String getType(Uri u){return "video/mp4";}
 public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException {if(!"r".equals(mode))throw new FileNotFoundException();return ParcelFileDescriptor.open(new File(getContext().getFilesDir(),"bunny.mp4"),ParcelFileDescriptor.MODE_READ_ONLY);}
 public Cursor query(Uri u,String[]p,String s,String[]a,String o){return null;} public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}public int update(Uri u,ContentValues v,String s,String[]a){return 0;}public int delete(Uri u,String s,String[]a){return 0;}
}