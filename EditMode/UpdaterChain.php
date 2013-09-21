<?php

namespace Hexmedia\AdministratorBundle\EditMode;

class UpdaterChain {

    /**
     * @var array
     */
    private $types;

    public function __construct() {
        $this->types = [];
    }

    /**
     * @param $type
     * @param $saverClass
     * @throws \Exception
     */
    public function addType($type, $saverClass) {
        if (isset($this->types[$type])) {
            throw new \Exception("Type '" . $this->types[$type] . "' already exists.");
        }

        $this->types[$type] = $saverClass;
    }

    /**
     * @param $type
     * @return mixed
     *
     * @TODO should throw an exception
     */
    public function getType($type) {
        return $this->types[$type];
    }

    /**
     * @param $content
     *
     * @TODO This method should be moved somewhere
     */
    public function parseContent($content) {
        $dc = json_decode($content, true);

        $ret = [];

        foreach ($dc as $key => $content) {
            preg_match("/^(?P<type>[a-z0-9A-Z]*):(?P<path>(?P<id>[a-z0-9A-Z]*):(?P<field>[a-z0-9A-Z]*))$/", $key, $matches);

            $ret[] = [
                'type' => $matches['type'],
                'path' => $matches['path'],
                'id' => $matches['id'],
                'field' => $matches['field'],
                'content' => $content
            ];
        }

        return $ret;
    }

}