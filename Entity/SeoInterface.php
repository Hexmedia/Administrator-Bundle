<?php

namespace Hexmedia\AdministratorBundle\Entity;

interface SeoInterface {
    function getTitle();
    function getSeoTitle();
    function getSeoDescription();
    function getSeoKeywords();
} 