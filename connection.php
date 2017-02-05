<?php

class mysqliSingleton{
    private static $instance;
    private $connection;
    public $db_nome = 'closerintime';
    private $host = 'localhost';
    private $user = 'closerintime';
    private $password = 'nood1OhDthui';

    private function __construct(){
        $this->connection = new mysqli( $this->host, $this->user, $this->password, $this->db_nome );
        if ( mysqli_connect_errno() ) {
            printf( "Connect failed: %s\n", mysqli_connect_error() );
        } else {
            $sql_utf8 = "SET NAMES 'utf8'";
            $this->connection->query( $sql_utf8 );
        }
    }

    public static function init(){
        if( is_null( self::$instance ) ){
            self::$instance = new mysqliSingleton();
        }
        return self::$instance;
    }

    public function __call( $name, $args ){
        if( method_exists( $this->connection, $name ) ){
             return call_user_func_array( array( $this->connection, $name ), $args );
        } else {
             trigger_error( 'Unknown Method ' . $name . '()', E_USER_WARNING );
             return false;
        }
    }
    
    public function getResult( $res, $row = 0, $field = 0 ){
        $res->data_seek( $row ); 
        $datarow = $res->fetch_array(); 
        return $datarow[$field]; 
    }
    
    public function getError(){
        return $this->connection->error;
    }
    
    public function getConnection(){
        return $this->connection;
    }
    
}

// $db = new mysqli( $conf->host,$conf->user,$conf->password,$conf->db );

$db = mysqliSingleton::init();

if( !function_exists( 'mysqli_result' ) ){
    function mysqli_result( $res, $row = 0, $field = 0 ) { 
        $res->data_seek( $row ); 
        $datarow = $res->fetch_array(); 
        return $datarow[$field]; 
    }
}


if( !function_exists( 'erli' ) ){    
    /**
     * Funzione per lanciare un error log in caso di errore
     * @param string $sql
     * @param MYSQLI_RESOURCE $res
     * @param $db L'oggetto link mysqli
     * @return boolean
     */
    function erli( $sql, $res, $db ){
        // meo( $db );
        if( !$db ){ 
            $db = mysqliSingleton::init();
        }
        $ret = true;
        $error = $db->getError();
        if( ( !$res ) || ( $error ) ){
            
            /*
            if( !$res ){
                meo( 'ho trovato falso $res, eccolo qua:');
                meo($res);
            }
            if( $error ){
                meo( 'ho trovato positivo $error, eccolo qua:');
                meo($error);
            }
            */
            
            error_log('Errore in questa query: ' . "\n" . $sql . "\n" . 'Mysqli error: ' . $error );
            $ret = false;
        }
        return $ret;
    }
}
